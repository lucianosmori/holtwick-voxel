// Title screen — first thing the player sees. Auto-dismisses for the
// Playwright visual gate (`?test=1`) so the village is captured directly,
// not the splash. On real loads, the player clicks "Enter the Village"
// or presses Enter/Space to dismiss with a 600ms fade.

export function bindTitle(): void {
  const screen = document.getElementById("title-screen");
  const start = document.getElementById("title-start");
  if (!screen || !start) return;

  const dismiss = () => {
    screen.classList.add("hidden");
    // Remove from the DOM after the fade so it can't catch stray taps later.
    window.setTimeout(() => screen.remove(), 700);
  };

  start.addEventListener("click", dismiss);
  window.addEventListener(
    "keydown",
    function onKey(e) {
      if (screen.classList.contains("hidden")) {
        window.removeEventListener("keydown", onKey);
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dismiss();
        window.removeEventListener("keydown", onKey);
      }
    },
  );

  // Auto-dismiss for visual-validator runs so the gate snapshots the
  // village, not the splash. `?test=1` is the same flag scene.ts uses
  // to enable preserveDrawingBuffer.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("test")) {
    dismiss();
  }
}
