// NPC dialog modal. On open, shows the NPC's name + a random idle bark as
// the greeting. On Send, lazy-loads WebLLM (Qwen2.5-1.5B-Instruct, ~1GB)
// and streams the assistant reply token-by-token into the chat bubble.
// When WebGPU is unavailable (headless validator, Firefox, locked-down
// browsers) `ensureEngine()` returns null fast and we fall back to a
// random scripted bark so the dialog still produces a reply.

import type { NpcDef } from "../data/npc.schema";
import {
  ensureEngine,
  getStatus,
  isReady,
  lastInitError,
  streamReply,
  subscribeStatus,
} from "../chat/webllm";

let bound = false;
let onCloseCb: (() => void) | null = null;
let currentNpc: NpcDef | null = null;
let streaming = false;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`dialog: missing #${id}`);
  return el;
}

function setStatusText(text: string): void {
  const el = document.getElementById("dialog-status");
  if (el) el.textContent = text || "idle";
}

export function bindDialog(onClose: () => void): void {
  if (bound) return;
  bound = true;
  onCloseCb = onClose;

  subscribeStatus((s) => setStatusText(s.text));

  $("dialog-close").addEventListener("click", () => closeDialog());

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("dialog-backdrop").classList.contains("show")) {
      e.preventDefault();
      closeDialog();
    }
  });

  $("chat-send").addEventListener("click", () => {
    void handleSend();
  });

  $("chat-input").addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  });
}

export function openDialog(npc: NpcDef): void {
  currentNpc = npc;
  $("dialog-name").textContent = npc.name;
  const messages = $("chat-messages");
  messages.innerHTML = "";
  const greeting = pickRandom(npc.barks_idle) ?? `I am ${npc.name}.`;
  appendMessage("assistant", greeting);
  setStatusText(getStatus().text);
  $("dialog-backdrop").classList.add("show");
  ($("chat-input") as HTMLInputElement).focus();
}

export function closeDialog(): void {
  $("dialog-backdrop").classList.remove("show");
  onCloseCb?.();
}

export function isDialogOpen(): boolean {
  return $("dialog-backdrop").classList.contains("show");
}

async function handleSend(): Promise<void> {
  if (!currentNpc || streaming) return;
  const input = $("chat-input") as HTMLInputElement;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  appendMessage("user", text);

  const npc = currentNpc;
  const send = $("chat-send") as HTMLButtonElement;
  send.disabled = true;
  streaming = true;
  const bubble = appendMessage("assistant", "…");

  try {
    const engine = await ensureEngine();
    if (!engine || !isReady()) {
      const fallback = pickRandom(npc.barks_idle) ?? "...";
      const reason = lastInitError() ? " (scripted bark — WebLLM unavailable)" : "";
      bubble.textContent = `${fallback}${reason}`;
      scrollToBottom();
      return;
    }
    bubble.textContent = "";
    await streamReply(npc, text, {
      onToken: (acc) => {
        bubble.textContent = acc;
        scrollToBottom();
      },
      onDone: (final) => {
        bubble.textContent = final;
        scrollToBottom();
      },
      onError: (msg) => {
        bubble.textContent = `(error: ${msg})`;
      },
    });
  } finally {
    streaming = false;
    send.disabled = false;
  }
}

function pickRandom<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function scrollToBottom(): void {
  const messages = $("chat-messages");
  messages.scrollTop = messages.scrollHeight;
}

function appendMessage(role: "user" | "assistant", text: string): HTMLElement {
  const messages = $("chat-messages");
  const wrap = document.createElement("div");
  wrap.className = `chat-msg chat-msg-${role}`;
  wrap.textContent = text;
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
  return wrap;
}
