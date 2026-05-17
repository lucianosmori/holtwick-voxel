// Settings modal (P7.4). Top-right gear icon opens a modal with three
// controls: master volume slider (persists via setMasterVolume), day-length
// slider (persists via dayNight.setCycleSeconds), and a reset-save button
// that wipes the save key and reloads. Escape / backdrop click close.

import { getMasterVolume, setMasterVolume } from "../audio/ambient";
import { clearSave } from "../game/save";
import {
  DAY_LENGTH_MAX,
  DAY_LENGTH_MIN,
  type DayNight,
} from "../world/dayNight";

let bound = false;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`settings: missing #${id}`);
  return el;
}

export interface SettingsDeps {
  dayNight: DayNight;
}

export function bindSettings(deps: SettingsDeps): void {
  if (bound) return;
  bound = true;

  const { dayNight } = deps;

  const gear = $("settings-gear");
  const backdrop = $("settings-backdrop");
  const closeBtn = $("settings-close");
  const volSlider = $("settings-volume") as HTMLInputElement;
  const volValue = $("settings-volume-value");
  const dayLenSlider = $("settings-day-length") as HTMLInputElement;
  const dayLenValue = $("settings-day-length-value");
  const resetBtn = $("settings-reset");
  const hudVol = document.getElementById("hud-volume") as HTMLInputElement | null;

  dayLenSlider.min = String(DAY_LENGTH_MIN);
  dayLenSlider.max = String(DAY_LENGTH_MAX);

  function syncFromState(): void {
    const vol = Math.round(getMasterVolume() * 100);
    volSlider.value = String(vol);
    volValue.textContent = `${vol}%`;
    const sec = Math.round(dayNight.getCycleSeconds());
    dayLenSlider.value = String(sec);
    dayLenValue.textContent = `${sec}s`;
  }

  gear.addEventListener("click", () => openSettings());
  closeBtn.addEventListener("click", () => closeSettings());
  backdrop.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });

  volSlider.addEventListener("input", () => {
    const pct = parseInt(volSlider.value, 10);
    const v = pct / 100;
    setMasterVolume(v);
    volValue.textContent = `${pct}%`;
    if (hudVol && hudVol.value !== volSlider.value) hudVol.value = volSlider.value;
  });

  // Mirror HUD slider edits back into the settings slider so the next open
  // shows the current value even if the player tweaked it from the HUD.
  if (hudVol) {
    hudVol.addEventListener("input", () => {
      if (!isSettingsOpen()) return;
      if (volSlider.value !== hudVol.value) {
        volSlider.value = hudVol.value;
        volValue.textContent = `${hudVol.value}%`;
      }
    });
  }

  dayLenSlider.addEventListener("input", () => {
    const sec = parseInt(dayLenSlider.value, 10);
    dayNight.setCycleSeconds(sec);
    dayLenValue.textContent = `${sec}s`;
  });

  resetBtn.addEventListener("click", () => {
    const ok = window.confirm(
      "Reset save? This wipes your gold, quests, and inventory, then reloads the page.",
    );
    if (!ok) return;
    clearSave();
    window.location.reload();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isSettingsOpen()) {
      e.preventDefault();
      closeSettings();
      return;
    }
    // Lowercase "s" toggle disabled — `s` is used by WASD. Gear-click only.
  });

  // Mark a render hook on first open in case the bound state drifts.
  syncFromState();
}

export function openSettings(): void {
  const backdrop = document.getElementById("settings-backdrop");
  if (!backdrop) return;
  // Refresh both sliders from authoritative state at open time so the modal
  // always reflects the current values, not a stale snapshot.
  const volSlider = document.getElementById("settings-volume") as HTMLInputElement | null;
  const volValue = document.getElementById("settings-volume-value");
  if (volSlider && volValue) {
    const vol = Math.round(getMasterVolume() * 100);
    volSlider.value = String(vol);
    volValue.textContent = `${vol}%`;
  }
  backdrop.classList.add("show");
}

export function closeSettings(): void {
  document.getElementById("settings-backdrop")?.classList.remove("show");
}

export function isSettingsOpen(): boolean {
  return !!document.getElementById("settings-backdrop")?.classList.contains("show");
}
