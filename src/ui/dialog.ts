// NPC dialog modal. Stage 1: opens with a canned greeting; WebLLM
// streaming wires in P4.2. DOM lives in index.html (#dialog-backdrop +
// children). Open/close keyboard handling (Esc) lives here.

export interface DialogContent {
  npcName: string;
  greeting: string;
}

let bound = false;
let onCloseCb: (() => void) | null = null;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`dialog: missing #${id}`);
  return el;
}

export function bindDialog(onClose: () => void): void {
  if (bound) return;
  bound = true;
  onCloseCb = onClose;

  $("dialog-close").addEventListener("click", () => closeDialog());

  // Esc closes the dialog when open.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("dialog-backdrop").classList.contains("show")) {
      e.preventDefault();
      closeDialog();
    }
  });

  // Send button is a stub for now — P4.2 will wire WebLLM streaming here.
  $("chat-send").addEventListener("click", () => {
    const input = $("chat-input") as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    appendMessage("user", text);
    input.value = "";
    appendMessage(
      "assistant",
      "(AI dialog not wired yet — P4.2 will lazy-load Qwen2.5-1.5B via WebLLM on first message. Top up PixelLab credits to also unblock real NPC sprites.)",
    );
  });

  $("chat-input").addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      ($("chat-send") as HTMLButtonElement).click();
    }
  });
}

export function openDialog(content: DialogContent): void {
  $("dialog-name").textContent = content.npcName;
  const messages = $("chat-messages");
  messages.innerHTML = "";
  appendMessage("assistant", content.greeting);
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

function appendMessage(role: "user" | "assistant", text: string): void {
  const messages = $("chat-messages");
  const wrap = document.createElement("div");
  wrap.className = `chat-msg chat-msg-${role}`;
  wrap.textContent = text;
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}
