// P8.2 — queued slide-in toast stack. Replaces the ad-hoc `#pickup-toast`
// banner from P6.3. At most MAX_VISIBLE toasts hold the screen at once;
// further pushes queue and spawn as older toasts complete their fade-out.

const MAX_VISIBLE = 3;
const SHOW_MS = 2500;
const FADE_MS = 250;
const CONTAINER_ID = "toast-container";

interface ToastEntry {
  el: HTMLDivElement;
  hideTimer: number;
}

const visible: ToastEntry[] = [];
const queue: string[] = [];

function ensureContainer(): HTMLDivElement {
  const existing = document.getElementById(CONTAINER_ID) as HTMLDivElement | null;
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = CONTAINER_ID;
  document.body.appendChild(el);
  return el;
}

function spawn(text: string): void {
  const container = ensureContainer();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  container.appendChild(el);
  // Force layout flush so the transition runs from the initial state.
  void el.offsetWidth;
  el.classList.add("show");

  const entry: ToastEntry = {
    el,
    hideTimer: window.setTimeout(() => beginDismiss(entry), SHOW_MS),
  };
  visible.push(entry);
}

function beginDismiss(entry: ToastEntry): void {
  const idx = visible.indexOf(entry);
  if (idx < 0) return;
  visible.splice(idx, 1);
  entry.el.classList.remove("show");
  window.setTimeout(() => {
    entry.el.remove();
    drain();
  }, FADE_MS);
}

function drain(): void {
  while (visible.length < MAX_VISIBLE && queue.length > 0) {
    spawn(queue.shift() as string);
  }
}

export function pushToast(text: string): void {
  if (visible.length < MAX_VISIBLE) {
    spawn(text);
  } else {
    queue.push(text);
  }
}

export function visibleToastCount(): number {
  return visible.length;
}

export function queuedToastCount(): number {
  return queue.length;
}
