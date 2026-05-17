// Keybind help modal (P8.8). `?` toggles open/close; Escape closes; typing
// into chat input keeps `?` going to the input instead of hijacking it. The
// keybinding list is the source of truth — render once on bind.

interface KeyBinding {
  keys: string[];
  description: string;
}

const BINDINGS: KeyBinding[] = [
  { keys: ["W", "A", "S", "D"], description: "Move (also arrow keys / touch joystick)" },
  { keys: ["Mouse"], description: "Look (fixed top-down camera for now)" },
  { keys: ["E"], description: "Talk to nearby NPC" },
  { keys: ["I"], description: "Open inventory" },
  { keys: ["`"], description: "Toggle FPS overlay" },
  { keys: ["?"], description: "Open this keybind help" },
  { keys: ["Esc"], description: "Close any open modal" },
  { keys: ["⚙"], description: "Settings (top-right gear icon)" },
];

let bound = false;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`keyhelp: missing #${id}`);
  return el;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function bindKeyHelp(): void {
  if (bound) return;
  bound = true;

  const list = $("keyhelp-list");
  list.innerHTML = "";
  for (const binding of BINDINGS) {
    const row = document.createElement("div");
    row.className = "keyhelp-row";
    const keyCell = document.createElement("div");
    keyCell.className = "keyhelp-keys";
    for (const k of binding.keys) {
      const kbd = document.createElement("kbd");
      kbd.textContent = k;
      keyCell.appendChild(kbd);
    }
    const descCell = document.createElement("div");
    descCell.className = "keyhelp-desc";
    descCell.textContent = binding.description;
    row.appendChild(keyCell);
    row.appendChild(descCell);
    list.appendChild(row);
  }

  $("keyhelp-close").addEventListener("click", () => closeKeyHelp());
  $("keyhelp-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeKeyHelp();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isKeyHelpOpen()) {
      e.preventDefault();
      closeKeyHelp();
      return;
    }
    if (e.key !== "?" || e.repeat) return;
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
    if (isKeyHelpOpen()) closeKeyHelp();
    else openKeyHelp();
  });
}

export function openKeyHelp(): void {
  $("keyhelp-backdrop").classList.add("show");
}

export function closeKeyHelp(): void {
  $("keyhelp-backdrop").classList.remove("show");
}

export function isKeyHelpOpen(): boolean {
  return $("keyhelp-backdrop").classList.contains("show");
}
