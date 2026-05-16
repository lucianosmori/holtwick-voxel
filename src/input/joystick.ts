// Touch-only virtual joystick. Ported from holtwick-tavern's index.html
// inline JS, adapted to TypeScript + a callback-based update.
// CSS + DOM elements live in index.html (#joystick + #joystick-knob).
// Hidden by default; shown via `@media (pointer: coarse)`.

export interface JoystickVector {
  x: number; // -1..1, right positive
  y: number; // -1..1, down (screen) positive
  active: boolean;
}

export type JoystickListener = (v: JoystickVector) => void;

export function setupJoystick(listener: JoystickListener): () => void {
  const root = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  if (!root || !knob) {
    console.warn("joystick: #joystick or #joystick-knob not found in DOM");
    return () => {};
  }

  const state: JoystickVector = { x: 0, y: 0, active: false };
  const radius = 65;

  const emit = () => listener({ ...state });

  const handleStart = (e: Event) => {
    e.preventDefault();
    state.active = true;
    emit();
  };

  const handleMove = (e: Event) => {
    if (!state.active) return;
    e.preventDefault();
    const t = (e as TouchEvent).touches?.[0] ?? (e as unknown as { clientX: number; clientY: number });
    const r = root.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > radius) {
      dx = (dx * radius) / d;
      dy = (dy * radius) / d;
    }
    state.x = dx / radius;
    state.y = dy / radius;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    emit();
  };

  const handleEnd = (e: Event) => {
    e.preventDefault();
    state.active = false;
    state.x = 0;
    state.y = 0;
    knob.style.transform = "translate(0, 0)";
    emit();
  };

  root.addEventListener("touchstart", handleStart, { passive: false });
  root.addEventListener("touchmove", handleMove, { passive: false });
  root.addEventListener("touchend", handleEnd, { passive: false });
  root.addEventListener("touchcancel", handleEnd, { passive: false });

  return () => {
    root.removeEventListener("touchstart", handleStart);
    root.removeEventListener("touchmove", handleMove);
    root.removeEventListener("touchend", handleEnd);
    root.removeEventListener("touchcancel", handleEnd);
  };
}
