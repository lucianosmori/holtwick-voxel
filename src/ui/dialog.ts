// NPC dialog modal. On open, shows the NPC's name + a random idle bark as
// the greeting. On Send, streams a reply from the Cloudflare/Groq proxy
// (Llama-3.1-8B-Instant) into the chat bubble. If the proxy is unreachable
// or returns nothing, falls back to a random scripted bark so the dialog
// still produces a reply labeled "(chat is offline)".

import type { NpcDef } from "../data/npc.schema";
import { streamProxyReply, warmupProxy } from "../chat/proxy";
import { questsGivenBy, questById } from "../data/quests";
import type { QuestDef } from "../data/quest.schema";
import { itemById } from "../data/items";
import { acceptQuest, getQuestState, onTalkTo } from "../game/quests";

let bound = false;
let onCloseCb: (() => void) | null = null;
let currentNpc: NpcDef | null = null;
let streaming = false;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`dialog: missing #${id}`);
  return el;
}

export function bindDialog(onClose: () => void): void {
  if (bound) return;
  bound = true;
  onCloseCb = onClose;

  // Warm the proxy on bind so the first NPC the player approaches gets a
  // hot worker isolate + Groq pipe even before they open the dialog.
  warmupProxy();

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

  for (const qid of onTalkTo(npc.id)) {
    const def = questById(qid);
    if (def) {
      appendMessage("assistant", `[Quest complete: ${def.title} — ${rewardSummary(def)}]`);
    }
  }

  renderQuestRow(npc);

  $("dialog-backdrop").classList.add("show");
  ($("chat-input") as HTMLInputElement).focus();
  warmupProxy();
}

function renderQuestRow(npc: NpcDef): void {
  const row = $("dialog-quest-row");
  const title = $("dialog-quest-title");
  const btn = $("dialog-quest-accept") as HTMLButtonElement;
  const available = questsGivenBy(npc.id).find(
    (q) => getQuestState(q.id)?.status === "not_started",
  );
  if (available) {
    title.textContent = available.title;
    btn.onclick = () => {
      if (!acceptQuest(available.id)) return;
      appendMessage("assistant", `[Quest accepted: ${available.title}]`);
      renderQuestRow(npc);
    };
    row.classList.add("show");
  } else {
    row.classList.remove("show");
    btn.onclick = null;
  }
}

export function closeDialog(): void {
  $("dialog-backdrop").classList.remove("show");
  onCloseCb?.();
}

export function isDialogOpen(): boolean {
  return $("dialog-backdrop").classList.contains("show");
}

export function getCurrentDialogNpcId(): string | null {
  if (!isDialogOpen() || !currentNpc) return null;
  return currentNpc.id;
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

  let proxyFailed = false;
  let proxyAcc = "";
  try {
    await streamProxyReply(npc, text, {
      onToken: (acc) => {
        proxyAcc = acc;
        bubble.textContent = acc;
        scrollToBottom();
      },
      onDone: (final) => {
        proxyAcc = final;
        bubble.textContent = final;
        scrollToBottom();
      },
      onError: (msg) => {
        proxyFailed = true;
        console.warn("[dialog] proxy error:", msg);
      },
    });

    if (proxyFailed || proxyAcc.length === 0) {
      const fb = pickRandom(npc.barks_idle) ?? "...";
      bubble.textContent = `${fb} (chat is offline)`;
      scrollToBottom();
    }
  } finally {
    streaming = false;
    send.disabled = false;
  }
}

function rewardSummary(def: QuestDef): string {
  const parts: string[] = [];
  if (def.reward.gold) parts.push(`${def.reward.gold} gold`);
  if (def.reward.items) {
    for (const r of def.reward.items) {
      const name = itemById(r.item_id)?.name ?? r.item_id;
      parts.push(r.count > 1 ? `${r.count}× ${name}` : name);
    }
  }
  return parts.length ? `received ${parts.join(" + ")}` : "no reward";
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
