# Holtwick Voxel

3D voxel rogue-like set in the Holtwick Tavern world. Three.js renderer, cloud-LLM NPCs (Cloudflare Worker -> Groq Llama-3.1-8B), procedural voxel village with day/night, quests, inventory, save/load, and a tavern at the center.

**Play it →** https://lucianosmori.github.io/holtwick-voxel/

Companion to [holtwick-tavern](https://github.com/lucianosmori/holtwick-tavern) (2D web chat with the same 31 NPCs).

## Status

Playable. Village world, lighting/shadows/sky, tavern + foliage + lanterns, day/night cycle, quest log + inventory + localStorage save/load, NPC dialog (Cloudflare/Groq with scripted-bark fallback), procedural Web Audio ambient + footsteps, walking NPCs, and a Playwright visual-validation gate are in place. PixelLab pixel-art sprites land when API credits are topped up.

| Slice | State |
|---|---|
| Voxel renderer + Kenney CC0 textures | ✅ |
| Procedural village floor (grass/dirt/stone/water) | ✅ |
| Tavern building (plank walls, doorway) | ✅ |
| Player movement + camera follow + collision | ✅ |
| Lighting + shadows + sky | ✅ |
| Day/night cycle (sun orbit + hemisphere blend) | ✅ |
| NPC dialog modal (Cloudflare/Groq, cross-browser) | ✅ |
| Quest schema + Edda → Aldric (talk) + Finn → 3 iron ore (collect) | ✅ |
| Quest log HUD + gold counter | ✅ |
| Item schema + world spawn + pickup + inventory modal (`I`) | ✅ |
| Save/load to localStorage (player + quests + inventory + picked items + phase) | ✅ |
| Walking NPCs (Edda, Finn, Cassia patrol waypoints) | ✅ |
| Procedural ambient audio + footsteps + volume slider | ✅ |
| Trees + foliage (30 procedurally placed) | ✅ |
| Lantern night lighting (4 warm PointLights ramped by phase) | ✅ |
| FPS overlay (backtick toggle) | ✅ |
| NPC pixel-art sprites (31, via PixelLab) | ⏳ blocked on credits |
| Per-NPC TTS | ⏳ deferred to v2 |

Iteration history in [`NOTES.md`](./NOTES.md); active task list in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

## Gameplay

- **Move** with WASD or arrow keys. On touch devices a virtual joystick appears bottom-left.
- **Talk to NPCs** by walking within 3 voxels and pressing `E` (or the on-screen Interact button on mobile). A proximity banner hints when an NPC is close. Type a message and `Enter` to chat — replies stream from the Cloudflare/Groq proxy; if the proxy is unreachable the NPC falls back to scripted barks.
- **Quests.** Edda offers *Find Aldric* (talk to him, +10 gold). Finn offers *Iron for the Forge* (pick up 3 iron ore, +25 gold, auto-completes on threshold). Open quests appear in the HUD top-right with status pills.
- **Inventory.** World items hover-spin on the ground (gold coins, health potions, iron ore). Walk over one to pick it up; a toast confirms. Press `I` to open the 4×3 inventory grid; the modal is gated so typing `i` into the chat input doesn't open it.
- **Save/load.** State auto-saves to `localStorage` (debounced 500ms + 30s heartbeat). Reload the page and player position, day/night phase, quests, inventory, and which world items have already been picked all restore. Picked items don't respawn.
- **Day/night.** Full cycle is ~2 minutes. Sun orbits in XZ, hemisphere colors blend dawn→day→dusk→night. Four lanterns (tavern doorway + 3 plaza corners) ignite at dusk and peak at midnight.
- **Audio.** Procedural ambient (pink-noise wind + occasional bird chirps in day, throbbing cricket at night) with a volume slider in the HUD. Footsteps fire on player travel; all routed through a single master gain that persists.
- **Debug.** Backtick toggles an FPS / draw-call overlay bottom-right.

## Screenshots

| | |
|---|---|
| ![Village at noon](./artifacts/screenshots/showcase-village-day.png) | ![Dialog with Edda](./artifacts/screenshots/showcase-dialog.png) |
| Procedural village at noon — grass plaza, dirt roads, plank tavern, pond. | NPC dialog modal streaming a reply from the Cloudflare/Groq proxy. |
| ![Inventory modal](./artifacts/screenshots/showcase-inventory.png) | ![Night with lanterns](./artifacts/screenshots/showcase-night-lanterns.png) |
| 4×3 inventory grid populated with gold, potions, and iron ore. | Same village at midnight — lanterns lit, cool moonlit hemisphere. |

Regenerate the gallery with `node scripts/capture-showcase.mjs` after a `npm run build`.

## Develop locally

```bash
npm install
npm run dev          # vite dev server on :5173
npm run build        # tsc --noEmit + vite build
npm run preview      # serve dist/ on :4173 (matches the live build)
npm run validate:visual  # headless Playwright screenshot + console-error check
```

## Stack

- **Renderer:** Three.js r160, `InstancedMesh` per voxel type, `MeshStandardMaterial` with Kenney prototype textures (`NearestFilter` for crisp pixel look)
- **World:** 64×3×64 voxel grid (`Uint8Array`), procedural village generator (deterministic seed), procedural cube-sky background, 30 instanced trees, 4 warm PointLights
- **Lighting:** `HemisphereLight` + `DirectionalLight` orbiting on a 2-minute day/night cycle, PCF soft shadows
- **NPCs:** `PlaneGeometry` billboards facing the camera (Y-axis only), 31 lifted from holtwick-tavern with persona + voice + dialog seeds; 3 walkers patrol waypoints
- **Chat:** Cloudflare Worker ([holtwick-llm-proxy](https://github.com/lucianosmori/holtwick-llm-proxy)) -> Groq `llama-3.1-8b-instant`. Cross-browser, no client-side model download, $0/month on free tiers. Per-NPC history capped at 12 turns, scripted-bark offline fallback.
- **Audio:** Web Audio API — pink-noise day chain (lowpass + rumble + chirps), AM-modulated cricket night chain, crossfade on phase boundaries, footsteps via 50ms white-noise bursts. No asset downloads.
- **Persistence:** `localStorage` SaveV1 — player XZ + dayNight phase + quests + inventory + picked-item indices. Debounced 500ms + 30s heartbeat.
- **Validation:** Playwright headless Chromium gate in every iter — screenshot to `artifacts/screenshots/iter-NN.png`, pixel-content assert (catches blank-canvas regressions), console-error guard, full dialog/quest/pickup/inventory/save-load/walker/audio/lantern/FPS flow exercised end-to-end

## License

MIT. Voxel textures from [Kenney Prototype Textures](https://kenney.nl/assets/prototype-textures) (CC0).
