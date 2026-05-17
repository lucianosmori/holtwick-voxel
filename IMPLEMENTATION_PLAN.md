# IMPLEMENTATION_PLAN.md

> Disposable. Drained top-down by the loop, one item per iteration. Strike finished items with `~~...~~`. Add new items discovered during work at the appropriate priority.

## Priority 0 — Must complete first (scaffolding, no rendering yet)

- [x] ~~**P0.1** Initialize Vite + TypeScript project: copy `package.json` shape from `../02-fp-overnight-roguelike/`, drop `phaser`, add `three@^0.160` and `@types/three`. Add `tsconfig.json`, `vite.config.ts`, `index.html` (single `<canvas id="game">`, no UI yet), `src/main.ts` (empty entrypoint that logs "boot ok"). Add `.gitignore` for `node_modules/` and `dist/`. Run `npm install` and verify `npm run build` (tsc --noEmit + vite build) passes.~~ (iter 2)
- [x] ~~**P0.2** Lift NPC data verbatim: copy `../02-fp-overnight-roguelike/src/data/npc.schema.ts`, `data/npcs.ts`, and all 31 files in `data/npcs/*.json` into `src/data/`. Do NOT modify contents. Add a smoke test in `src/data/npcs.test.ts` (or a `npm run check:data` script) that imports the loader and asserts 31 NPCs validate against the schema.~~ (iter 3 — `npm run check:data` via tsx; 31 NPCs validate; `npm run build` still green)
- [x] ~~**P0.3** Lift `chat/webllm.ts` and `audio/sfx.ts` verbatim from `../02-fp-overnight-roguelike/src/` into `src/chat/` and `src/audio/`. Add `@mlc-ai/web-llm@^0.2.83` to deps. Confirm `tsc --noEmit` still passes — do NOT wire these into the runtime yet, just make them compile.~~ (iter 4 — files copied byte-for-byte; `@mlc-ai/web-llm@^0.2.83` already in deps from iter 2; `npm run build` + `npm run check:data` both green)
- [x] ~~**P0.4** Three.js bootstrap: `src/render/scene.ts` creates `Scene`, `PerspectiveCamera` (fov 55, pitched ~55° looking down), `WebGLRenderer` attached to `#game`. `src/main.ts` calls bootstrap, starts a `requestAnimationFrame` loop that clears + renders, handles `window.resize`. Add a single rotating reference cube at origin so we can eyeball that rendering works.~~ (iter 5 — scene/camera/renderer + RAF loop + resize handler + rotating ref cube; `npm run build` green, 454 kB bundle)

## Priority 1 — First playable slice (single-room walkable demo)

- [x] ~~**P1.1** Voxel grid module `src/world/voxel.ts`: `VoxelGrid` class backed by `Uint8Array`, with `get(x,y,z)`, `set(x,y,z,v)`, `dims`. `0` = empty, `1` = floor, `2` = wall. Pure data, no rendering.~~ (iter 6 — `VoxelGrid` + `VOXEL_EMPTY/FLOOR/WALL` exports; out-of-bounds `get` returns empty for safe collision queries; `set` throws on OOB; build green)
- [x] ~~**P1.2** Voxel renderer `src/render/voxelMesh.ts`: takes a `VoxelGrid`, builds one `InstancedMesh` per voxel type using shared `BoxGeometry(1,1,1)` and palette materials. Returns a `THREE.Group`. Re-buildable on demand; not optimized for streaming yet.~~ (iter 7 — `buildVoxelMesh(grid, palette?)` returns `THREE.Group` with one `InstancedMesh` per non-empty type from `DEFAULT_VOXEL_PALETTE` (floor 0x6b6259, wall 0x3a3733); two-pass count→fill, instance positioned at voxel center; tsc + vite build green)
- [x] ~~**P1.3** Hand-authored 32×1×32 single-room layout: floor everywhere, walls on the 4 outer edges, in `src/world/rooms.ts` as `buildStarterRoom(): VoxelGrid`. Wire it into `main.ts`, replacing the rotating cube.~~ (iter 8 — `buildStarterRoom()` fills 32×1×32 with FLOOR, overwrites perimeter with WALL; `main.ts` builds the room mesh, recenters group at origin, drops the rotating cube; `npm run build` green at 458 kB)
- [x] ~~**P1.4** Player avatar `src/entities/player.ts`: a single colored `Mesh` (cube for now) with `position`, `velocity`. WASD input from `KeyboardEvent`, axis-aligned movement on XZ at constant speed. Wall collision against the `VoxelGrid` (AABB vs occupied cells). No jumping.~~ (iter 9 — `Player` class with `BoxGeometry(0.6³)` mesh at world y=1.3; WASD+arrows attach/detach via `attachKeyboard()`; `update(dt)` normalizes diagonal, axis-separated AABB sweep against `VOXEL_WALL` cells across the full footprint so player slides along walls; `main.ts` runs RAF with capped `dt`; build green at 460 kB)
- [x] ~~**P1.5** Camera follow: in the main loop, each frame set `camera.position = player.position + cameraOffset`, `camera.lookAt(player.position)`. Tunable offset constant in `src/render/scene.ts`.~~ (iter 10 — `updateCamera()` in `main.ts` copies `player.mesh.position`, adds `CAMERA_OFFSET` (already exported from scene.ts at iter 5), `lookAt(player)`; invoked once pre-RAF then each frame after `player.update`; build green at 460 kB)
- [x] ~~**P1.6** Billboard NPC `src/entities/npc.ts`: `PlaneGeometry(1,1.5)` with a placeholder canvas-generated texture (single solid color + label). Spawn one NPC at a fixed cell in the starter room. Each frame `mesh.lookAt(camera.position)` constrained to Y axis only.~~ (iter 11 — `BillboardNpc` class wraps `PlaneGeometry(1,1.5)` + `MeshBasicMaterial(map=canvasTexture)`; `makePlaceholderNpcTexture` paints solid bg + centered label on a 128×192 canvas with nearest-neighbour filtering and sRGB color space; `faceCamera()` copies camera pos with `y=npc.y` and `lookAt`s that, so the plane only yaws; one NPC spawned at cell (16, 22) of the starter room and refaced each RAF tick; build green at 461 kB)
- [x] ~~**P1.7** GH Pages deploy workflow `.github/workflows/deploy.yml`: build on push to main, publish `dist/` to `gh-pages` branch. Configure `vite.config.ts` `base` for the repo path. First deploy must serve the P1 build successfully — link goes into NOTES.md. **SPEC-LOCK CHECKPOINT: stop here and surface the live URL to the user before iter on P2.**~~ (iter 12 — extended existing `.github/workflows/pages.yml` to also build 07 and mount its `dist/` under `07-fp-overnight-roguelike-3d/` in the combined Pages artifact; relied on existing `vite.config.ts` `base: "./"` so relative asset paths resolve from the subdir; expected URL `https://lucianosmori.github.io/poc-fiesta-2026-05/07-fp-overnight-roguelike-3d/`. **CHECKPOINT — loop must halt until user confirms the live build.**)

## Spec-lock unlocked 2026-05-13

User verified iter-12 build, approved the **Holtwick-tavern fantasy** theme + **Kenney mini-block voxel textures** + **PixelLab pixflux NPC sprites by ralph** + **Playwright validation in every iter**. Continue from P2.

## Priority 2 — Visual lock (Holtwick fantasy aesthetic)

- [x] ~~**P2.0** Add Playwright validation to the loop. Install `playwright` as dev dep. Add `scripts/validate-visual.mjs` that: spins `vite preview` on :4173, loads page with `waitUntil:networkidle`, waits for `canvas`, asserts no console errors, takes full-page screenshot to `artifacts/screenshots/iter-${ITER:-manual}.png`. Add `npm run validate:visual` script. From this iter forward, the loop runs `npm run build && npm run validate:visual` and **fails the iter on validation failure** — patch loop.ps1/loop.sh to call it.~~ (iter 13 — `playwright ^1.49.0` dev-dep + `scripts/validate-visual.mjs` (uses Vite's `preview()` Node API on :4173, chromium headless, captures `pageerror`+`console.error`, full-page PNG to `artifacts/screenshots/iter-${ITER:-manual}.png`); `npm run validate:visual` script; loop.ps1 + loop.sh both extend the iter prompt to require `build`+`validate:visual` green pre-commit AND re-run them as a post-iter gate that halts on regression. scene.ts gained `?test=1`-gated `preserveDrawingBuffer:true` so headless screenshots actually capture WebGL frames instead of a cleared canvas — without this the gate was passing on visually blank builds. Confirmed end-to-end: iter-13.png shows starter room + player cube + NPC billboard with "NPC" label.)
- [x] ~~**P2.0b** Strengthen `scripts/validate-visual.mjs` with a pixel-content assert: after `page.screenshot`, also `page.evaluate` `canvas.toDataURL` (or read a center patch via `getImageData` on a 2D copy) and fail if the captured frame is >99% a single color (catches the silent-blank regression we hit at iter 13 even if console is clean). Without this, a future renderer regression that wipes the buffer again would slip past the gate.~~ (iter 14 — `validate-visual.mjs` now downsamples canvas#game to a 512px long edge in an offscreen 2D canvas, reads `getImageData`, bins colors at 5-bit-per-channel resolution, and fails when the top bin exceeds 99% of the frame. Current build reads 67.43% top-bin / 51 bins — healthy margin; a blank black canvas would read 100% in a single (0,0,0) bin and trip the gate. Console gate + screenshot trail preserved.)
- [x] ~~**P2.1** Wire Kenney mini-block voxel texture pack (already staged at `assets/voxel/` by the user) into `src/render/voxelMesh.ts`. Replace flat-color materials with `MeshStandardMaterial` per voxel type, each with a Kenney texture loaded via `TextureLoader`. Set `NearestFilter` for crisp pixel look. Voxel types: floor=grass, wall=stone or wood, plus new types: dirt, planks, water (for later use).~~ (iter 15 — `world/voxel.ts` adds `VOXEL_DIRT=3`, `VOXEL_PLANKS=4`, `VOXEL_WATER=5` consts + widened `VoxelType` union; `render/voxelMesh.ts` palette entries now carry `textureUrl?` and load Kenney PNGs via Vite `?url` imports — grass=Green/texture_01, stone=Light/texture_06, dirt=Dark/texture_05, planks=Orange/texture_04 — through a cached `TextureLoader` with `NearestFilter` + `NearestMipmapNearestFilter` + `SRGBColorSpace` + `RepeatWrapping`. Water keeps the flat-color path (0x3a6da6) since the pack ships no blue. `buildMaterial()` picks map-or-color per entry. Visual gate iter-15 screenshot: starter room renders grass-textured floor + stone perimeter walls (top-bin dropped 67.4%→41.8%, bin count 51→152 — texture pack adds genuine pixel variety). Build 471.92 kB.)
- [x] ~~**P2.2** Add lighting: `DirectionalLight` (sun, color 0xffeecc, intensity 1.2, positioned high-southwest, casts shadows) + `HemisphereLight` (sky/ground tint, intensity 0.4). Update existing materials to receive light. Verify visual with `validate:visual`.~~ (iter 16 — `scene.ts` swaps the legacy ambient+flat-dir pair for `HemisphereLight(0xbcd6ff, 0x4a3a2a, 0.4)` + `DirectionalLight(0xffeecc, 1.2)` at `(-18, 30, -18)` (high-southwest of the centered 32×32 room) targeting origin; renderer enables `shadowMap` with `PCFSoftShadowMap`; sun gets a 2048² shadow map with an ortho frustum of ±22 (covers the room with margin), near 1 / far 80, bias `-0.0005`. Voxel `InstancedMesh` and player cube both opt in via `castShadow`+`receiveShadow`; NPC billboard intentionally skipped (flat plane shadow reads weird). Visual gate: top-bin 41.8%→37.15%, bins 152→165 (lighting + shadow contrast adds variety); iter-16.png shows the player's shadow on the grass floor and a warm-light/cool-shadow gradient along the stone perimeter. Build 472.52 kB.)
- [x] ~~**P2.3** Add skybox: load Kenney CC0 sky/nature skybox cube texture from `assets/voxel/skybox/` (user-staged) into scene background via `CubeTextureLoader`. Verify the horizon line reads correctly with the new lighting.~~ (iter 17 — staged skybox asset wasn't actually present at `assets/voxel/skybox/`, so built a procedural stylized cube-sky in `src/render/sky.ts`: six 256² canvases (4 horizon faces with a vertical gradient zenith→horizonTop→horizonBottom→ground + a warm horizon band; top face radial zenith-to-horizon dome; bottom face flat ground). Wired into `scene.ts` via `scene.background = buildProceduralSky()` replacing the prior flat 0x111418. Visual gate: bins 165→220 (sky gradient adds ~55 fresh color buckets), top-bin held at 37.15% (still well under 99%). iter-17.png shows the warm horizon band above the green floor, no console regressions. Follow-up: if/when a real Kenney sky/nature cube PNG set is staged, swap the `buildProceduralSky()` call for `new THREE.CubeTextureLoader().load([...6 face urls...])`.
- [x] ~~**P2.4** Procedural village floor `src/world/village.ts`: replace `buildStarterRoom` with `buildVillage(seed)` that returns a 64×1×64 `VoxelGrid` with: grass biome ~60%, dirt paths ~25%, stone plaza ~10%, water pond ~5%. Deterministic via seed. Player still spawns at world center.~~ (iter 18 — `buildVillage(seed=1337)` returns 64×1×64 grid filled grass; carves a 20×20 `VOXEL_STONE` plaza centered at (32,32), 7-wide N/S+E/W `VOXEL_DIRT` roads, a 2-deep dirt ring framing the plaza, 6 seeded scatter patches (r 2-4) for outskirts wear, and a jittered-edge circular `VOXEL_WATER` pond at (12,50) r=8 that only overwrites grass. New `VOXEL_STONE=6` const + palette entry (reuses wall stone texture — semantically a walkable floor tile, no collision). `rooms.ts` deleted (unused). Shadow camera widened to ±40 / far 140 + sun moved to (-30,50,-30) to cover the bigger world. `main.ts` switched to `buildVillage(VILLAGE_SEED=1337)`; NPC spawn re-anchored to plaza-southeast (cx+6, cz+6). Visual gate iter-18.png shows central gray plaza, four radial dirt roads, scattered grass, dark pond top-left, orange player on plaza, NPC SE — top-bin 15.96% / 216 bins, no console errors. Validate-visual.mjs swapped flaky `waitForSelector(canvas#game)` for `waitForFunction(data-engine attr set)` — same readiness signal but stable across the bigger build. Build green 474.69 kB.)
- [x] ~~**P2.5** Add a tavern building procedurally at the plaza: wooden walls (planks voxel type), single doorway (gap in wall), interior 6×4 floor. Hand-coded layout is fine — no need for full BSP yet.~~ (iter 19 — new `src/world/tavern.ts` `addTavern(grid, {originX, originZ, doorwayX})` stamps an 8×6 outer footprint (6×4 interior) of `VOXEL_PLANKS` floor at y=0 and a 2-tall (`TAVERN_WALL_HEIGHT=2`) plank wall ring at y=1..2; doorway = 1-cell gap in the south wall at the configured x. `village.ts` bumps `VILLAGE_HEIGHT = 1 + TAVERN_WALL_HEIGHT = 3`, fills only the y=0 ground plane explicitly (so upper layers stay empty), and stamps the tavern last at `(originX=28, originZ=14, doorwayX=32)` so it overwrites the north dirt road into a plank threshold. `player.ts` collision widened: hits if ANY non-empty voxel at y≥1 lies in the footprint (legacy `VOXEL_WALL` at y=0 still blocks for back-compat) — so the player slides along walls and walks through the doorway. iter-19.png shows the orange plank tavern north of the gray plaza with a darker doorway gap in the south wall; visual gate: top-bin 15.96%, 320 bins (216→320, +104 from plank surfaces). Build green 475.57 kB.)

## Priority 3 — Character lock (PixelLab pixflux NPCs by ralph)

- [x] ~~**P3.1** PixelLab pixflux generation script `tools/genSprites.mjs` (Node, ESM, not bundled): reads `src/data/npcs.ts` to get 31 NPC IDs + names + persona/visual descriptors. For each NPC, calls PixelLab pixflux API with: a fantasy-village style anchor prompt + the NPC's persona-derived visual prompt + a fixed style-seed for the whole batch (so all 31 sprites feel like one art family). Writes `public/sprites/<npc_id>_<dir>.png` for 4 directions (south/west/north/east). Env-gated (`PIXELLAB_API_KEY`); skip-if-exists by default; rate-limit with sleep between requests. Document run instructions in NOTES.md. Run once and commit the generated PNGs.~~ (iter 20 — script + `npm run gen:sprites` shipped, uses PixelLab `/create-character-with-4-directions` for 1-call-per-NPC 4-direction output; bypasses Vite-only `npcs.ts` loader by reading JSON directly; auth chain `PIXELLAB_API_KEY → PIXELLAB_TOKEN → ~/.pixellab-token`. Smoke-test resolved a 422 (endpoint rejects `negative_description`+`no_background`) → minimal `{description, image_size}` body. Final smoke hit 402 Insufficient credits — **the batch run is split into P3.1b below, blocked on credit top-up.**)
- [ ] **P3.1b** (BLOCKED — PixelLab HTTP 402, `Generations remaining: 0, Credits: 0.0`; skip this iter, do not retry until user has topped up at https://www.pixellab.ai) Run `npm run gen:sprites` once credits are replenished. Validate sample sprites visually. Commit all 124 PNGs to `public/sprites/`. If style consistency is weak, document tuning note in NOTES.md before P3.2.
- [ ] **P3.2** (BLOCKED on P3.1b — needs the sprite PNGs to wire) Wire real sprites into `src/entities/npc.ts`: replace placeholder canvas with `TextureLoader` loading `public/sprites/<npc_id>_<dir>.png`. Pick direction texture from yaw quadrant of (camera→npc) vector.
- [ ] **P3.3** (BLOCKED on P3.2 — needs working sprite wiring) Spawn all 31 NPCs at scripted positions around the village. Positions in a new `src/data/npcSpawns.ts` map keyed by NPC ID.

## Priority 4 — Gameplay depth (graduation features)

- [x] ~~**P4.0** Mobile controls + interact discovery: touch joystick (ported from holtwick-tavern), interact button (mobile) + E key (desktop), proximity hint banner.~~ (commit `0bcdc0a` 2026-05-16 — `src/input/joystick.ts` exposes `setupJoystick(listener)` with touch-only DOM in `index.html#joystick`, `Player.setJoystick(jx, jy)` overrides keyboard with 0.15 deadzone; `src/ui/interact.ts` does per-frame proximity check + hint + button enable + E key. Mobile UI gated `@media (pointer: coarse)`.)
- [x] ~~**P4.1** Dialog modal `src/ui/dialog.ts`: on click within 3 voxels of an NPC (raycast or AABB check), open an HTML overlay with NPC name + chat input. Close on Esc. Just the UI shell first; no LLM wired yet.~~ (commit `0bcdc0a` 2026-05-16 — `src/ui/dialog.ts` exposes `bindDialog(onClose)` + `openDialog({npcName, greeting})` + `closeDialog()` + `isDialogOpen()` + Esc handler. Modal DOM lives in `index.html#dialog-backdrop` with chat-messages scroller, Send button + Enter key. Send currently echoes a stub message — full WebLLM streaming is P4.2.)
- [x] ~~**P4.2** Wire chat into the dialog modal: stream LLM tokens into the chat output. (Originally WebLLM, replaced 2026-05-16 with Cloudflare/Groq proxy — see commits `30f8e6b` for the WebLLM removal + bundle drop from 6,035 kB to 488 kB.) Use the NPC's persona JSON as system prompt. Tested via Playwright by clicking the canvas at the NPC's screen position and verifying the modal opens.~~ (iter 22 — `src/data/tavernCast.ts` adds `EDDA: NpcDef` (innkeeper persona, 6 idle barks, 2 combat barks) since the lifted dungeon NPC corpus is all monsters; `src/ui/dialog.ts` now takes an `NpcDef`, subscribes to `subscribeStatus` to drive the `#dialog-status` pill, on Send lazy-calls `ensureEngine()` + `streamReply(npc, text, {onToken,onDone,onError})` with token-by-token updates into the assistant bubble. `chat/webllm.ts` gained a `isWebGpuUsable()` precheck — `navigator.gpu.requestAdapter()` returns null in headless Chromium (the `'gpu' in navigator` check alone wasn't enough; Chromium exposes the API object even when no adapter exists), so when no real adapter is present we short-circuit to status `error` + a scripted-bark fallback instead of triggering the multi-MB WebLLM dynamic import. `main.ts` exposes `window.__voxelTest__.openDialog()` only when `?test=1`. `scripts/validate-visual.mjs` now opens the dialog via that hook, dispatches the Send via `evaluate` (Playwright's `click()` waits for topmost-element which intermittently fails under the full-viewport canvas), waits for a non-placeholder assistant reply, and captures `iter-${ITER}-dialog.png`. iter-22-dialog.png shows Edda greeting + user "Hello, Edda." + fallback bark "Drink up. The night is long in these hills. (scripted bark — WebLLM unavailable)" — confirming the engine-unavailable path. Build 484.40 kB main + 6,034.65 kB lazy webllm chunk; gate green (top-bin 15.96% / 323 bins, no console errors).
- [ ] **P4.3** TTS playback per NPC. **DEFERRED to v2** (2026-05-16) — needs sentence-boundary detection from the Groq SSE stream + voice configs per NPC; non-trivial and not on tonight's path. Don't pick up overnight.
- [x] ~~**P4.4** Day/night cycle: animate `DirectionalLight` orbit over 6-min cycle. Adjust `HemisphereLight` colors with time. Verify via Playwright at two different fake-time points.~~ (commit `10b8d91` 2026-05-16 — `src/world/dayNight.ts` `DayNight` class orbits sun on a 6-min cycle, blends sky+ground hemi colors by phase, `?dayNight=<0..1>` URL override for testing. Validate-visual captures noon + dusk screenshots.)
- [x] ~~**P4.5** Quest JSON schema + first quest.~~ (superseded 2026-05-16 by **P6.1+P6.2** — full quest schema + Edda→Aldric quest + HUD log; broader scope than the original P4.5)
- [x] ~~**P4.6** Inventory bar UI.~~ (superseded 2026-05-16 by **P6.3+P6.4** — item schema + world spawn + pickup + modal inventory triggered by `I` key)

## Priority 5 — Polish + graduation

- [x] ~~**P5.1** Sound: ambient music + footsteps + tavern hum + volume slider.~~ (superseded 2026-05-16 by **P6.8** — Web Audio API procedural ambient + footsteps, no asset sourcing during overnight burn)
- [x] ~~**P5.2** Title screen: "Holtwick: The Voxel Tavern" splash with start button.~~ (commit `d43b152` 2026-05-16 — `src/ui/title.ts` renders splash with click-to-dismiss + Enter/Space key, auto-dismisses on `?test=1` for headless screenshots.)
- [x] ~~**P5.3** Performance pass.~~ (superseded 2026-05-16 by **P6.11** — FPS overlay toggleable via backtick; full frustum-culling + draw-call audit can be a v2 follow-up)
- [x] ~~**P5.4** README rewrite + graduation marker.~~ (superseded 2026-05-16 by **P6.12** — README rewrite + screenshot gallery after P6.1-P6.11 land; graduation flip happens after that)

## Priority 6 — Overnight burn 2026-05-16: gameplay loop + living village

Stack-locked by user 2026-05-16 (plan `tender-twirling-hopper`). Phase ordered
so the playable loop ships first (P6.1-P6.6) and atmosphere layers stack on
top (P6.7-P6.11). Each iter has a single "done when" criterion Playwright
can assert. No "or" choices — every schema, key binding, audio source, and
save format is locked in this plan and must NOT be re-litigated mid-burn.

Validation gate per iter: `npm run build && npm run validate:visual && npm
run test:dialog` must ALL pass before commit. Push after each commit.

PixelLab credit-blocked items (P3.1b through P3.3) stay BLOCKED — do not
attempt sprite generation during this burn even if you walk past them in
the priority order.

- [x] ~~**P6.1** Quest schema + first quest (Edda → Aldric → 10 gold reward).
  Files: `src/data/quest.schema.ts` (new), `src/data/quests.ts` (new),
  `src/game/quests.ts` (new) for state machine + event log,
  `src/data/npcSpawns.ts` add optional `quest?: string` per NPC,
  `src/ui/dialog.ts` inject an "[ Accept quest ]" button under the chat
  input when the open NPC has a quest in `not_started` state. Click →
  set state to `in_progress`, fire `onQuestAccepted` event, toast in HUD.
  Walking to Aldric + opening dialog → auto-complete trigger fires (per
  `quest.trigger.type === "talk_to"`), state → `complete`, 10 gold awarded,
  toast.~~ (iter 23 — schema + state machine + `QUESTS[edda_find_aldric]`
  shipped; accept row injected between `#chat-messages` and `#chat-input-row`
  in `index.html` (CSS in same file), `dialog.ts` calls `onTalkTo(npc.id)` on
  open to auto-complete in_progress `talk_to` quests targeting this NPC and
  appends `[Quest complete: … +N gold]` lines into the chat for confirmation.
  `npcSpawns.ts` left untouched — quest associations derive from
  `QuestDef.giver_npc_id`, no duplication needed. `__voxelTest__` hook
  extended: `openDialog(npcId?)`, `acceptQuest(id)`, `getQuestState(id)`,
  `getQuests()`, `getGold()` — existing no-arg callers (validate-visual main
  flow + test-dialog) keep working since `npcId` is optional. HUD toast
  intentionally not built here — `P6.2` owns the HUD; the in-chat
  confirmation line keeps the flow legible without it. `validate-visual.mjs`
  extended with the full Edda→accept→Aldric→complete flow asserting
  `getQuestState("edda_find_aldric").status === "complete"` and
  `getGold() === 10`; capture at `artifacts/screenshots/iter-${ITER}-quest.png`.
  All three gates green.)

  **Schema:**
  ```typescript
  export interface QuestDef {
    id: string;
    giver_npc_id: string;
    title: string;
    description: string;
    trigger: { type: "talk_to"; npc_id: string };
    reward: { gold: number };
  }
  export type QuestStatus = "not_started" | "in_progress" | "complete";
  export interface QuestState {
    status: QuestStatus;
    accepted_at?: number;
    completed_at?: number;
  }
  ```

  **First quest:** `id: "edda_find_aldric"`, giver `"edda"`, trigger talk
  to `"aldric"`, reward 10 gold.

  **Done when:** Playwright opens Edda dialog via `__voxelTest__.openDialog("edda")`
  hook, clicks the accept button, then opens Aldric's dialog and asserts
  the quest log shows 1 complete entry + gold counter shows 10.

- [x] ~~**P6.2** Quest log HUD + gold counter.~~ (iter 24 — `src/ui/hud.ts`
  `mountHud()` renders `#hud-gold`, `#hud-quest-count`, `#hud-quest-list`
  and subscribes to `subscribeQuests` so gold + quest transitions re-render
  without polling. `index.html` adds `#hud` (top-right, 200px, opacity 0.85,
  pointer-events: none, z-index 5, monospace, dashed divider, status-tinted
  rows — green `[done]`, amber `[active]`). Quests stay hidden from the log
  until accepted (`not_started` filtered) so the panel reads "Quests (0)"
  until the player engages. `main.ts` calls `mountHud()` after `bindTitle()`.
  Inventory row is intentionally absent here — wires in with P6.3 when the
  inventory state lands. `validate-visual.mjs` extended: after the P6.1
  Edda→Aldric flow, asserts `#hud` is visible AND `#hud-gold === "Gold: 10"`
  AND `#hud-quest-count === "Quests (1)"` AND the single row starts with
  `[done] ` and contains `Find Aldric`. All three gates green (`build`
  489.84 kB, `validate:visual` top-bin 18.64% / 347 bins, `test:dialog`
  all checks pass). iter-24-quest.png captures the HUD in the corner with
  the completed quest.)

- [x] ~~**P6.3** Item schema + 3 item types + world spawn + pickup.~~
  (iter 25 — `src/data/item.schema.ts` (`ItemDef` + `HealEffect` union),
  `src/data/items.ts` (3 items: `gold_coin` 0xffd84a stack 999, `health_potion`
  0xd64a4a stack 10 heal 25, `iron_ore` 0x8a8a8a stack 50), `src/game/inventory.ts`
  (counts Map + subscribe/emit `PickupEvent` with stack-cap clamped `delta`),
  `src/world/village.ts` `computeItemSpawns(seed, grid, npcCells, count=12)` walks
  a `mulberry32(seed ^ 0xa17e)` stream so item placement doesn't shift voxel layout,
  rejects water/empty ground + any cell with non-empty voxels at y≥1 (walls) + an
  8×8 plaza-center buffer + every cell within 1 voxel of an NPC, caps at 500
  attempts. `src/entities/worldItem.ts` `WorldItem` wraps a 0.3³ emissive cube
  (`MeshStandardMaterial`, emissiveIntensity 0.35, metalness 0.7 for gold), float
  `ITEM_BASE_Y = 1 + ITEM_HALF + 0.25`, `update(t)` does `y = baseY + sin(t*2 + phase)*0.1`
  + slow yaw spin; phase derived deterministically from (worldX, worldZ) so reloads
  match. `main.ts` builds the 12 items into `worldItems`, per-frame `checkPickups()`
  computes 2D distance² vs `(PICKUP_RADIUS + PLAYER_HALF)²` (0.85), on hit calls
  `addItem`, flips `it.picked`, disposes mesh+geom+material, shows a debounced
  bottom-center `#pickup-toast` ("+1 Gold Coin"). `index.html` adds the toast div
  + CSS (rgba+amber border, fade/slide 0.25s, z-index 6) — placeholder until
  P8.2's queued slide-in stack replaces it. `__voxelTest__` extended:
  `movePlayerTo(x, z)`, `getInventory()`, `getItemCount(id)`,
  `getItemWorldPositions()`, `addItem(id, count?)`. `validate-visual.mjs` post-quest:
  pulls spawn list, warps player onto first un-picked item, polls
  `getItemCount(id) > 0`, asserts inventory stack reflects the pickup AND the
  world entry flips to picked=true; captures `iter-${ITER}-pickup.png`. `npm run build`
  green.)

- [x] ~~**P6.4** Inventory modal triggered by `I` key.~~ (iter 26 —
  `src/ui/inventory.ts` builds 12 fixed slots (4×3) into `#inventory-grid`,
  `I` toggles open/close gated by `isEditableTarget` + dialog-open guard,
  Escape closes, backdrop click closes, subscribes to `subscribeInventory`
  so pickups refresh while open. `index.html` adds modal + CSS (56px slots,
  32px color square, name label, count badge top-right, empty=dashed border,
  z-index 110). `main.ts` calls `bindInventory()` + extends `__voxelTest__`
  with `openInventory/closeInventory/isInventoryOpen`. `validate-visual.mjs`
  post-pickup: presses KeyI, asserts 12 slots + ≥1 populated, captures
  `iter-${ITER}-inventory.png`, Esc closes, then opens dialog → focuses
  chat-input → presses KeyI → asserts `#inventory-backdrop.show` NOT set
  AND chat-input value === "i". Build green 494.72 kB.)

- [x] ~~**P6.5** Save/load to localStorage.~~ (iter 27 —
  `src/game/save.ts` `SaveV1 {version:1, player:{x,z}, dayNight, quests,
  inventory, gold, saved_at}` under `holtwick-voxel:save:v1`. `loadSave()`
  drops on parse error or version mismatch; `applySave()` calls back into
  `restoreQuestsState()` (new, in `game/quests.ts` — rehydrates the map +
  emits so the HUD re-renders) and `restoreInventory()` (new, in
  `game/inventory.ts` — discards unknown item ids + clamps to stack cap +
  emits a delta=0 pickup per stack so any open modal refreshes), and
  applies player XZ + dayNight phase via injected setters. `dayNight.ts`
  gains `setPhase(p)` that no-ops when the `?dayNight=` URL override is
  active so headless screenshots stay locked. `bindAutoSave()` subscribes
  to `subscribeQuests` + `subscribeInventory`, runs a 30s heartbeat tick,
  and coalesces writes through a 500ms debounce; `bindDialog`'s onClose
  also triggers `scheduleSave()`. `main.ts` calls `loadSave()` +
  `applySave()` between player construction and world-item spawn (HUD
  already subscribed via earlier `mountHud()` so the restore emit
  re-renders the panel), then `bindAutoSave()` after dialog/inventory
  binds. `__voxelTest__` extended with `flushSave/clearSave/getDayNightPhase`.
  `validate-visual.mjs` adds a post-inventory P6.5 block: flush save,
  `page.reload()`, re-wait for data-engine + `__voxelTest__`, assert
  quest status still complete + gold still 10 + the picked-up stack
  matches, plus HUD shows `Gold: 10` / `Quests (1)` / `Find Aldric`, then
  `clearSave()` so the chromium profile stays clean for re-runs. Build
  green at 497.16 kB.)

- [x] ~~**P6.5.1** **REGRESSION FIX (highest priority — pick before P6.6).**
  P6.5 save/load shipped a double-pickup bug: after `flushSave + reload`, an
  item that was picked up pre-save respawns in the world AND the player
  position is restored adjacent to it, so the auto-pickup loop fires
  again. Result: saved inventory `{count: 1}` becomes `{count: 2}` after
  reload. CI gate caught it (run 25983800585, commit 42be396):
  `[validate:visual] save/load flow assert failed: post-reload inventory
  mismatch for health_potion: expected 1, got {item_id: "health_potion",
  count: 2}`.

  **Fix design (locked, no choices):** the deterministic
  `computeItemSpawns(seed, grid, npcCells)` in `src/world/village.ts`
  returns an ordered `ItemSpawn[]`. Each spawn's stable identity is its
  **index in that returned array** (since seeded gen produces the same
  ordering every run). Extend the runtime + SaveV1 to track picked
  indices:

  1. In `src/main.ts` where the pickup loop fires (currently mutates
     `worldItems` and removes the mesh), record the spawn's index. The
     cleanest spot: when iterating `itemSpawns` to build `worldItems`,
     keep `worldItems` as a parallel array with the SAME indexing as
     `itemSpawns` (push `null` for already-picked slots after load
     restores them). Pickup callback receives the index and writes it
     into a `pickedItemIndices: Set<number>` in
     `src/game/inventory.ts` (export `markPicked(index)` +
     `getPickedIndices(): number[]` + a `subscribePicked` event).
  2. Extend `SaveV1` in `src/game/save.ts`: add
     `picked_item_indices: number[]` (sorted ascending for stable diff).
     `captureSave()` reads via `getPickedIndices()`; `applySave()`
     calls a new `restorePickedIndices(arr)` BEFORE main.ts spawns the
     world items. If main.ts spawns before applySave runs, reorder so
     applySave runs first.
  3. In `main.ts` item-spawn loop: skip `itemSpawns[i]` if the picked
     set contains `i`. The corresponding `worldItems[i]` slot stays
     null and the pickup loop already skips null/disposed entries.
  4. `bindAutoSave()` already subscribes to `subscribeInventory`;
     extend it to also subscribe to `subscribePicked` so picks are
     captured even without an inventory delta (defensive).

  **Schema bump:** `SaveV1.version` stays `1` (additive field — old saves
  without `picked_item_indices` should default to `[]`, then immediately
  auto-resave to backfill the field).

  **Done when:** the CI's existing P6.5 reload assertion passes —
  `health_potion` count stays at 1 after `flushSave + reload`. Also
  asserts via new sub-check: `__voxelTest__.getItemWorldPositions()`
  after reload returns 11 entries (12 minus the 1 that was picked), not
  12.

  **Why not just delete the picked item from `itemSpawns` permanently:**
  because `itemSpawns` is recomputed from seed on every page load — we
  can't mutate it across sessions. Indices are the stable handle.~~ (iter 28
  — `inventory.ts` adds `pickedIndices: Set<number>` + `markPicked`,
  `getPickedIndices` (sorted asc), `isPicked`, `restorePickedIndices`,
  `subscribePicked` mirroring the existing inventory listener pattern.
  `save.ts` `SaveV1.picked_item_indices: number[]` (additive on v1; older
  saves default to `[]` in applySave and re-save with the field populated
  next debounce), captured in `buildSnapshot` via `getPickedIndices`,
  restored in `applySave` AFTER `restoreInventory` and BEFORE main.ts
  spawns world items (ordering already held). `bindAutoSave` also
  `subscribePicked(scheduleSave)` so a pick without an inventory delta
  (e.g. stack-full no-op) still persists. `main.ts` switched `worldItems:
  (WorldItem | null)[]` parallel to `itemSpawns` indexing — load loop
  pushes `null` for `isPicked(i)` slots, pickup loop calls `markPicked(i)`
  + nulls the slot + disposes the mesh, RAF tick + `__voxelTest__.getItemWorldPositions`
  filter nulls. `validate-visual.mjs` post-reload sub-check: snapshot
  pre-reload world-item count + post-reload count, assert they match
  (regression would be `pre - 1` becomes `pre` again after respawn). Build
  green 497.71 kB. CI gate's existing P6.5 inventory-count assertion will
  no longer trip on health_potion 1→2.)

- [x] ~~**P6.6** Second quest: Finn → collect 3 iron ore.~~ (iter 29 —
  `data/quest.schema.ts` `trigger` widened to a `QuestTrigger`
  discriminated union adding `{type:"collect", item_id, count}`.
  `data/quests.ts` appends `finn_iron_ore` (giver `finn`, collect 3
  `iron_ore`, reward 25 gold; description has Finn-the-bard fetching on
  Boran's behalf since the existing FINN is the bard and BORAN the smith
  — lore-consistent rather than retconning Finn). `game/quests.ts`
  imports `getItemCount` + `subscribeInventory` from `./inventory`
  (one-way dep); `acceptQuest` immediately completes a collect quest if
  the threshold was already met at accept-time; `onTalkTo(npcId)` also
  auto-completes in_progress collect quests whose giver is `npcId` when
  inventory threshold met (defensive fallback); new idempotent
  `bindCollectAutoComplete()` subscribes to `subscribeInventory` and
  completes any in_progress collect quest whose total crossed `count`.
  `main.ts` calls `bindCollectAutoComplete()` after `bindInventory()`,
  post applySave so restore's delta=0 emits don't double-process.
  `validate-visual.mjs` post-save/load: snapshot gold,
  `acceptQuest("finn_iron_ore")` (asserts in_progress), `addItem("iron_ore", 3)`,
  asserts quest auto-completed AND gold == before+25, opens Finn's
  dialog + captures `iter-${ITER}-collect.png`. Build green 498.38 kB.)

- [x] ~~**P6.7** NPC pathing — 3 NPCs walk waypoints.~~ (iter 30 —
  `src/entities/npcWalker.ts` `NpcWalker(mesh, waypoints, gridOffset)`
  with `NPC_WALK_SPEED=0.4` voxels/sec, `NPC_HALT_DISTANCE=3` (halts
  when player squared-distance < 9 units²), pause→walk state machine
  loops the waypoint array forever. `data/npcSpawns.ts` `NpcSpawn` gains
  optional `path?: PathWaypoint[]`; three spawns wired with 2-waypoint
  patrols: **Edda** (31,17)↔(32,19) tavern-interior↔doorway pause 3s,
  **Finn** (30,16)↔(36,22) tavern-corner↔Boran-forge-stand-in pause 2s,
  **Cassia** (36,34)↔(32,22) plaza-east↔tavern-approach pause 4s. Bren
  isn't in our cast (would arrive in P7.2 from the smith/well-keeper/
  merchant/wanderer list which doesn't include "Bren" either) so the
  3rd walker slot uses Cassia — same plaza↔tavern spirit. `main.ts`
  collects `walkers: NpcWalker[]` while building interactables and
  ticks each per RAF frame with `player.mesh.position`. `__voxelTest__`
  extended with `getNpcPosition(id) → {x,z} | null`. `validate-visual.mjs`
  post-collect-quest: warps player to (-26,-26) (cell ~(6,6), far from
  every waypoint), snapshots before, waits 6.5s (> longest 4s pause +
  meaningful walk distance), snapshots after, asserts all 3 walkers
  moved ≥0.1 voxels; captures `iter-${ITER}-walk.png`. Build green
  499.68 kB.)

- [x] ~~**P6.8** Procedural ambient audio + footsteps via Web Audio API.~~
  (iter 31 — `src/audio/ambient.ts` owns the shared AudioContext + master
  GainNode + day/night chains. Day chain: 2s pink-noise buffer (Paul
  Kellet economy filter, scaled to ~±1) looped through a 800Hz lowpass
  (gain 0.22) + a 110Hz sine rumble (gain 0.02). Night chain: 4kHz sine
  carrier whose amplitude is AM-modulated by an 8Hz LFO connected to a
  GainNode `.gain` AudioParam (baseline 0.018, ±0.018 from LFO →
  throbbing cricket, ends up below day amplitude per spec). `isNight(phase)
  = phase ∈ [0.7, 0.95)` per spec; `updateAmbient(dt, phase)` drives each
  chain's gain toward its target via exponential approach with τ =
  CROSSFADE_SEC/3 so the crossfade reaches ~95% in 3s. Daytime chirps:
  brief sine bursts 1200-2400Hz with exponential up/down envelope every
  5-15s, only when day chain is dominant (gain > 0.3). Master gain
  persists to `localStorage` under `holtwick-voxel:audio:volume`; default
  0.5; `setMasterVolume(v)` clamps + writes. `startAmbient()` exposes
  `window.__audioCtx` so the visual gate can assert state==="running".
  `src/audio/footsteps.ts` `maybeStep(x, z)` fires when squared player
  distance from cursor ≥ STEP_DISTANCE² (0.09); plays a 50ms white-noise
  buffer through a 600Hz lowpass with ±10% playbackRate jitter, routed
  through the shared master so the volume slider attenuates it too.
  `resetFootstepCursor(x, z)` snaps the cursor on warps (save restore +
  test `movePlayerTo`) so phantom steps don't fire. `main.ts` registers
  one-shot `pointerdown`/`keydown`/`touchstart` listeners that call
  `startAmbient()` — browsers block AudioContext creation/resume without
  a trusted gesture, so we can't init at boot. Per-frame: `maybeStep(...)`
  + `updateAmbient(dt, dayNight.currentPhase)`. `index.html` adds
  `#hud-volume-row` (slider + label) inside `#hud`; the row sets
  `pointer-events: auto` since the parent HUD is non-interactive. Slider
  wired in main.ts: initial value from `getMasterVolume()`, `input` event
  → `setMasterVolume(value/100)`. `scripts/validate-visual.mjs` P6.8
  block: explicit `page.mouse.click(20,20)` for a guaranteed trusted
  gesture, waits up to 4s for `window.__audioCtx.state === "running"`,
  asserts `#hud-volume` is a `type=range` input. Build green at 503.50 kB
  (up ~3.8 kB from 499.68 kB).)

  **No asset downloads.** All synthesis via Web Audio API nodes.

  **Ambient day:** `AudioBufferSourceNode` filling a 2-second buffer
  with pink noise looped, routed through `BiquadFilterNode` lowpass at
  800Hz; layered with `OscillatorNode` sine at 110Hz (low rumble) at
  gain 0.02; plus occasional brief sine bursts at 1200-2400Hz (bird
  chirps) every 5-15s.

  **Ambient night:** swap to a cricket pulse — `OscillatorNode` sine at
  4000Hz amplitude-modulated by another oscillator at 8Hz; lower master
  volume by ~30%.

  **Crossfade:** when `dayNight.phase` crosses 0.7 (sunset) or 0.95
  (dawn), 3-second crossfade between day and night ambient.

  **Footsteps:** subscribe to player position; trigger every 0.3
  player-units traveled; 50ms white noise burst through a lowpass at
  600Hz; pitch (playbackRate) varies ±10% per step.

  **Volume slider** added to `#hud`: master `GainNode` between
  ambient/footsteps and `destination`. Slider value persists in
  localStorage under `holtwick-voxel:audio:volume`.

  **Done when:** Playwright asserts `window.__audioCtx?.state === "running"`
  after dispatching a synthetic click (audio needs a gesture). Also assert
  the volume slider is present in the HUD.

- [x] ~~**P6.9** Trees + foliage.~~ (iter 32 — `src/world/foliage.ts`
  `computeFoliage(seed, grid, npcCells, itemCells, count=30)` walks a
  `mulberry32(villageSeed + 7331)` stream, rejects cells unless ground
  is `VOXEL_FLOOR` (grass) AND column above is empty, enforces a
  Chebyshev 8-cell plaza buffer + 2-cell road buffer (scans the
  surrounding 5×5 for any `VOXEL_DIRT` cell) + 3-cell NPC + 3-cell item
  buffer, 800-attempt cap; `buildFoliageMesh(trees)` returns a
  `THREE.Group` with two `InstancedMesh`es — trunk uses
  `Dark/texture_05.png` (same Kenney dirt swatch the dirt voxel uses)
  for 4 cubes per tree at world y=1.5..4.5; canopy uses flat
  `0x2f6b22` (darker than grass texture's dominant bin so foliage adds
  new pixel-content bins) for 8 cubes per tree — 4 orthogonal cells per
  layer × 2 layers (y=3.5, 4.5) — the "3×3 with corners + centre
  removed" plus-shape minus its centre. `main.ts` computes `trees`
  after items, builds the mesh, positions it at `gridOffset` so cells
  line up with the voxel mesh. Build green 505.51 kB (+2.0 kB vs iter
  31's 503.50 kB).)

- [x] ~~**P6.10** Lantern night lighting.~~ (iter 33 — `src/render/lanterns.ts`
  `buildLanterns(gridOffset)` returns 4 warm-orange (`0xffb070`)
  `THREE.PointLight`s, range 6, max intensity 1.5, mounted at world y=3 over
  cells: tavern-doorway (one cell south of `TAVERN_DOORWAY_X`,
  `TAVERN_ORIGIN_Z + footprintDepth`), plaza NE/NW/SE corners (derived from
  `PLAZA_HALF=10` around village centre (32,32)). `lanternIntensityForPhase(p)`
  derives from the same elevation curve the sun uses (`cos(p*2π)`) shifted
  by +0.3 so lanterns ignite as the sun crosses ~70% of the way down (dusk
  pool reads before full dark), peaking at midnight, falling off symmetric
  through dawn — matched to dayNight's actual phase convention (0=noon,
  0.25=dusk, 0.5=midnight, 0.75=dawn) rather than the plan's now-corrected
  draft. `main.ts` calls `buildLanterns(gridOffset)`, adds each light to the
  scene, calls `updateLanterns` once pre-RAF (so the load-restored phase
  takes effect immediately) and again every frame after `dayNight.update(dt)`.
  `__voxelTest__` extended with `setDayNightPhase(p)` (delegates to
  `DayNight.setPhase`, which already no-ops under `?dayNight=` URL overrides)
  and `getLanternIntensities()` returning `[{label, intensity}, …]`.
  `validate-visual.mjs` P6.10 block: drives phase to noon, asserts all four
  lanterns are dark (intensity ≤ 0.01); drives phase to midnight, asserts
  all four reach intensity ≥ 1.0; captures `iter-${ITER}-lanterns.png`;
  resets phase to noon so any later assertions inherit clean day state.
  Build green 507.66 kB (+2.15 kB vs iter 32's 505.51 kB).)

- [x] ~~**P6.11** FPS counter overlay (backtick key toggle).~~ (iter 34 —
  `index.html` adds `#fps-overlay` (bottom-right, monospace, hidden by
  default; `.show` flips display:block; `pointer-events:none` so it stays
  out of the way of clicks); `src/ui/hud.ts` exports
  `setFpsOverlayText/setFpsOverlayVisible/isFpsOverlayVisible`. `src/main.ts`
  runs a rolling 60-frame `Float32Array` of `dt` values, advances
  `fpsRenderCounter` per frame, and every 10 frames (when visible) writes
  `${fps}fps · ${draw} draw · ${ms}ms` where `fps = round(1/avgDt)`,
  `draw = renderer.info.render.calls` (snapshotted after `renderer.render`
  so it reflects the just-rendered frame), `ms = (avgDt*1000).toFixed(1)`.
  Backtick (`e.code === "Backquote"`) keydown toggles visibility, gated by
  a local `isEditableTarget` helper (same pattern as inventory's `I` key)
  + `e.repeat` guard so holding the key doesn't strobe. Sampler ticks
  every frame so the rolling window stays warm even while hidden — the
  first write after toggling on is immediate. `scripts/validate-visual.mjs`
  P6.11 block: asserts overlay is hidden at boot, presses Backquote, waits
  ≤2s for `#fps-overlay.show` AND the text to match `^(\d+)fps` with the
  number > 0, then presses Backquote again to confirm the toggle-off path.
  Build green 508.43 kB (+0.77 kB vs iter 33's 507.66 kB).

- [x] ~~**P6.12** README v1 + showcase screenshots.~~ (iter 35 —
  `scripts/capture-showcase.mjs` boots its own `vite preview` on :4175
  and captures 4 named PNGs under `artifacts/screenshots/`:
  `showcase-village-day.png` (`?test=1&dayNight=0`, boot + screenshot),
  `showcase-dialog.png` (open Edda via `__voxelTest__.openDialog("edda")`,
  send "Tell me about Holtwick.", wait for the streamed assistant reply
  bubble), `showcase-inventory.png` (seed `gold_coin x12 + health_potion
  x3 + iron_ore x5` via `__voxelTest__.addItem`, press `KeyI`, wait for
  `#inventory-backdrop.show`), `showcase-night-lanterns.png`
  (`?test=1&dayNight=0.5` locks midnight so the 4 PointLights ramp to
  full intensity against the cool moonlit hemisphere). Each scene gets
  its own page+navigation so the URL override applies cleanly. README
  rewritten: status table ticks P6.1–P6.11, new `## Gameplay` section
  covers movement, talk, quests, inventory, save/load, day/night, audio,
  debug overlay, new `## Screenshots` section renders the 4 PNGs in a
  2×2 grid with captions, Stack section updated to reflect 64×3 grid +
  audio + persistence + the full validation footprint. Build green
  508.43 kB. Per plan: `status.json` stays at `exploring` — graduation
  flip deferred to P8.8.)

## Priority 7 — Overnight burn (continued): content + polish layer

Stack-locked 2026-05-16. Layers on top of P6 once gameplay loop ships.
Each iter is locked and self-contained — no "or" choices. Items chosen
to add SURFACE AREA (more content + buildings + NPCs + quests) and
POLISH (settings, idle barks, minimap) without introducing new
mechanics that need design decisions overnight.

- [x] ~~**P7.1** More buildings: blacksmith forge, village well, 2
  market stalls.~~ (iter 36 — `src/world/buildings.ts` exports
  `addBlacksmith` (6×6 plank ring + east doorway at z=22 + single
  `VOXEL_STONE` anvil at interior centre), `addWell` (radius-2 stone
  ring at y=1 around `(46, 30)` + `VOXEL_WATER` at centre y=0), and
  `addMarketStall` ×2 at `(20, 36)` + `(24, 36)` (4 plank posts y=1..2
  + 3×2 plank canopy at y=3). `VILLAGE_HEIGHT` bumped to
  `1 + max(TAVERN_WALL_HEIGHT, BUILDINGS_MAX_Y=3)` = 4 so the canopy
  fits. Player collision in `entities/player.ts` constrained to the
  player's actual y range `[floor(PLAYER_Y - half), floor(PLAYER_Y +
  half)]` instead of the whole column, so the stall canopy doesn't
  wall off the cells beneath it. Build green at 509.74 kB. Visual gate
  runs in CI on push.)

- [x] ~~**P7.2** 5 more tavern NPCs.~~ (iter 37 — 31-NPC corpus
  is all hostile mobs (rats, ghouls, liches, demons), no village roles to
  lift verbatim; authored 5 fresh NpcDefs in `src/data/tavernCast.ts`
  matching the EDDA/FINN/etc pattern: `KARSTEN` (apprentice smith at
  blacksmith interior `(21,22)` next to the anvil), `HILDA` (well-keeper
  at `(46,28)` 2 cells north of well centre), `PETRA` (baker at market
  stall 1 `(21,36)` between posts), `RONAN` (messenger/courier at market
  stall 2 `(25,36)` between posts), `DORIN` (wandering miner on plaza
  centre `(28,32)`). Spawn coords nudged off the plan's `(20,36)/(24,36)`
  stall-corner positions onto the interior x cells between the 4 corner
  posts so billboards don't clip the plank posts. Barks_idle reference
  existing NPCs (Karsten ↔ Boran, Dorin ↔ Boran+Edda, Petra ↔ Edda+Cassia,
  Ronan ↔ Aldric) so the chat reads like a real village. `TAVERN_CAST`
  + `NPC_SPAWNS` extended; `main.ts` `__voxelTest__` gained
  `getNpcCount(): number`. `validate-visual.mjs` adds P7.2 block asserting
  `getNpcCount() === 12`. Item + foliage exclusion buffers already widen
  around NPC cells, so the 500/800-attempt caps absorb the +5 without
  dropping spawned counts. Build green 513.06 kB (+3.32 kB vs iter 36).)

- [x] ~~**P7.3** Minimap HUD (top-left, 150×150).~~ (iter 38 —
  `src/ui/minimap.ts` `mountMinimap(gridOffset)` returns `{ update(frame) }`.
  150×150 2D canvas; static layer (BG `#1a1f2c` + 7-wide N/S+E/W dirt
  roads + 20×20 stone plaza + tavern outline as amber stroke +
  translucent amber fill) pre-rendered once into an offscreen canvas at
  mount, then per-update we `clearRect` + `drawImage(base)` + paint
  dynamic dots: items (2×2 gold), lanterns (4×4 warm orange, only when
  `intensity > 0.5`), NPCs (3×3 cyan), player (4×4 yellow on top).
  World→cell conversion uses the gridOffset passed at mount so the
  axes align with the voxel mesh. Static math imports `VILLAGE_WIDTH/
  DEPTH` from village + `TAVERN_INTERIOR_WIDTH/DEPTH` from tavern;
  village is 64×64 voxels → 128×128 px → 11px margin centres it inside
  the 150 canvas. `index.html` adds `#minimap` canvas top-left (16px
  inset, amber 1px border, opacity 0.9, `image-rendering: pixelated`,
  `pointer-events: none` so it doesn't eat canvas clicks, z-index 5
  matching the HUD). `main.ts` mounts after `gridOffset` is computed,
  calls a one-shot `tickMinimap()` so the very first paint shows the
  static layer + player dot, then increments a `MINIMAP_RENDER_EVERY=10`
  counter inside the RAF loop and re-paints when it trips. Lit
  threshold matches lantern peak (1.5 max, 0.5 cutoff catches dusk +
  midnight). `validate-visual.mjs` P7.3 block: asserts `canvas#minimap`
  is 150×150 + not display:none, reads `getImageData(0,0,150,150)`,
  asserts ≥4 unique 24-bit colors (catches the silent-blank case where
  the static layer never drew), asserts ≥1 yellowish pixel (r>220, g
  180-235, b<120) so the dynamic update is also wired (catches the case
  where only the static base layer ever renders). Captures
  `iter-${ITER}-minimap.png`. Build green at 515.07 kB main bundle
  (+1.64 kB vs iter 37's 513.06 kB).

- [x] ~~**P7.4** Settings menu (gear icon top-right, modal).~~ (iter 39 —
  `src/ui/settings.ts` `bindSettings({dayNight})` wires gear-click,
  Escape, backdrop-click. Modal has master volume slider (calls
  `setMasterVolume` → persists `holtwick-voxel:audio:volume`, mirrors
  HUD slider both ways), day-length slider 60–1800s (calls
  `dayNight.setCycleSeconds` → persists `holtwick-voxel:dayLength`,
  preserves cycle phase when changed), and "Reset save" button with
  `window.confirm` → `clearSave()` + `window.location.reload()`.
  `world/dayNight.ts` `cycleSeconds` now mutable + restored from
  `DAY_LENGTH_KEY` at construction (clamped to `[DAY_LENGTH_MIN,
  DAY_LENGTH_MAX]` = [60, 1800]) plus `setCycleSeconds` /
  `getCycleSeconds` accessors. `index.html` adds `#settings-gear`
  (36×36 amber-bordered button at top:14/right:16, z-index 6),
  `#settings-backdrop` modal (z-index 120, above inventory's 110 +
  dialog's 100) with two ranges + reset button + live value labels;
  HUD shifted to `top: 60px` so the gear sits cleanly above it.
  `main.ts` calls `bindSettings({ dayNight })` after `bindInventory()`.
  `scripts/validate-visual.mjs` P7.4 block: clicks gear, asserts modal
  visible AND `#settings input[type='range']` count === 2 AND
  `#settings-reset` is a button, dispatches `input` on day-length
  slider with value 600, asserts label reads "600s", captures
  `iter-${ITER}-settings.png`, Esc closes. Build green at 517.49 kB
  (+2.42 kB vs iter 38's 515.07 kB).

- [x] **P7.5** Animated NPC idle barks (proximity-triggered). DONE iter 40.

- [x] ~~**P7.6** Quest 3 — "Visit the well" (talk-to type).~~ (iter 41
  — `src/data/quests.ts` gains `well_visit` entry: giver `hilda` (the
  Well-Keeper from P7.2, already spawned at (46,28) two cells north of
  the well centre at (46,30) — well within the "3-cell radius" trigger
  ring described in the plan), `trigger: { type: "talk_to", npc_id:
  "hilda" }`, `reward: { gold: 5 }`. Wiring is zero — the existing
  `questsGivenBy(npc.id)` in `dialog.ts` renders the accept-row for any
  NPC who hands out a quest, and `onTalkTo(npc.id)` already auto-
  completes a `talk_to` whose target matches the dialog NPC, so the
  giver-and-target-are-the-same-NPC pattern Just Works: first open
  shows the accept row (not_started → can't auto-complete), accept
  flips to in_progress, close + re-open and `onTalkTo` finds the
  in_progress talk_to quest with matching npc_id → completes + awards
  5 gold. `validate-visual.mjs` P7.6 block: snapshots `goldBefore`,
  `openDialog("hilda")` and asserts `#dialog-quest-row.show` with a
  title containing "well", clicks `#dialog-quest-accept`, asserts
  state=in_progress, presses Escape, re-opens Hilda's dialog, asserts
  state=complete and gold === goldBefore + 5, captures
  `iter-${ITER}-well.png`. Build green 520.08 kB (+0.24 kB vs iter 40's
  519.84 kB).

- [x] ~~**P7.7** Quest 4 — "Collect 5 gold coins" (collect type).~~
  (iter 42 — `src/data/quest.schema.ts` loosens `reward` to
  `{ gold?: number; items?: Array<{ item_id; count }> }` (both optional,
  back-compat for the 3 existing gold-only entries). `src/game/quests.ts`
  `completeQuest` now gates gold on `def.reward.gold` and iterates
  `def.reward.items` via `addItem` (which respects per-item stack caps +
  emits inventory events the HUD already listens to). `src/data/quests.ts`
  gains `bren_5_coins` — plan called for "Bren the bard" but the tavern
  cast has Finn the Bard and no Bren, so the giver is `finn` (already gives
  `finn_iron_ore` — `questsGivenBy` returns both and `renderQuestRow`
  picks the first not_started, so iron_ore-complete + bren_5_coins-
  not_started ordering Just Works). `trigger: { type: "collect", item_id:
  "gold_coin", count: 5 }`, `reward: { items: [{ item_id: "health_potion",
  count: 1 }] }`. `src/ui/dialog.ts` extracts `rewardSummary(def)` so the
  `[Quest complete: …]` line renders "received 10 gold" OR "received
  Health Potion" OR "received 10 gold + Health Potion" depending on the
  reward shape; falls back to "no reward" defensively. `validate-visual.mjs`
  P7.7 block snapshots potion + gold, `acceptQuest("bren_5_coins")`,
  `addItem("gold_coin", 5)` → asserts state=complete, potion === before+1,
  gold unchanged (non-gold-reward path), opens Finn's dialog for the
  capture `iter-${ITER}-coins.png`, Esc closes. Build green 520.74 kB
  (+0.66 kB vs iter 41's 520.08 kB).

- [x] ~~**P7.8** README v2 (no graduation flip — moved to **P9.6**).~~
  (iter 43 — `README.md` rewritten: status table ticked through P7.7
  with new rows for buildings (4 types), 12-NPC cast, walking patrols,
  proximity idle barks, 4 quests, minimap, settings modal, title splash,
  mobile controls, and the CI Playwright gate; added a dedicated
  **Controls** table (WASD/arrows, joystick, `E`, `I`, backquote, gear,
  volume slider, `Esc`); added a **Roster** table mapping all 12 NPC IDs
  to names + roles + quest-giver annotations sourced from
  `src/data/tavernCast.ts` + `src/data/quests.ts`; added a **Recap by
  the numbers** section (4 quests, 3 items, 4 building types, 12 NPCs,
  30 trees, 4 lanterns, 2-min cycle, 64×3×64 grid); Gameplay section
  expanded with the 4-quest list + buildings paragraph + HUDs paragraph;
  Stack section refreshed (12 NPCs not 31, 4 buildings, settings-adjustable
  day length, picked-item indices in save schema, full CI flow listed in
  the validation bullet); Develop-locally block adds `npm run test:dialog`
  + a note that both gates run in CI not locally per the 2026-05-17
  Playwright-off-the-dev-machine policy. `status.json` intentionally
  stays at `exploring` — graduation deferred to P9.6.)

## Priority 8 — Extra overshoot (only mined if P6 + P7 land early)

Stack-locked 2026-05-16. Pure content/visual/HUD additions, zero new
mechanics. Loop continues past P8 into P9 voxel polish, then graduates
at P9.6.

- [x] ~~**P8.1** Decorative props: barrels + crates instanced near
  buildings.~~ (iter 44 — `src/world/props.ts` `computeProps(seed, grid,
  reserved, count=20)` walks `mulberry32(seed ^ 0xb022)` over the 1-cell
  ring outside each of 5 building zones (tavern, blacksmith, well, 2
  stalls), keeps only grass cells (`VOXEL_FLOOR` at y=0) with an empty
  column at y≥1, dodging cells reserved by NPCs/items/trees. Per-zone
  targets sum to 20: tavern 6 + blacksmith 6 + well 4 + stalls 2 each.
  Each prop is randomly barrel (scale 0.6×0.9×0.6, darker dirt texture
  reads as banded staves) or crate (scale 0.7³, plank texture) — two
  `InstancedMesh` siblings on the shared 1×1×1 `BoxGeometry`, both
  shadow-cast/receive. Reserved cells in `main.ts` = NPC spawns + item
  spawns + tree cells (foliage already runs first). Mesh positioned at
  same `gridOffset` as voxel mesh; `__voxelTest__.getPropPositions()`
  exposes cell+world coords + type. `validate-visual.mjs` P8.1 block
  asserts 20 props total + adjacency to ≥2 of {tavern, blacksmith, well,
  stalls} via inflated-bbox cell tests, warps player near a tavern prop
  and captures `iter-${ITER}-props.png`. Build green 523.79 kB.)

- [x] ~~**P8.2** Toast notification system (animated bottom-center).~~
  (iter 45 — `src/ui/toast.ts` exports `pushToast(text)` +
  `visibleToastCount/queuedToastCount`. Internal state holds at most
  `MAX_VISIBLE=3` active `.toast` divs at a time; further pushes wait
  in `queue: string[]` and spawn from `drain()` once an older toast
  completes its `SHOW_MS=2500` hold + `FADE_MS=250` fade-out. `spawn`
  appends a fresh `.toast` div into `#toast-container`, forces a layout
  flush (`void el.offsetWidth`) so the CSS transition runs from the
  initial state, then adds `.show` to drive opacity 0→1 +
  `translateY(40px→0)` over 250ms. `beginDismiss` removes `.show`,
  schedules the actual DOM removal `FADE_MS` later, then calls
  `drain()` so the queue advances exactly once per slot freed.
  `index.html` replaces the old `#pickup-toast` div + CSS with
  `#toast-container` (bottom-center flex column, gap 8px, z-index 8,
  `pointer-events: none`) + `.toast`/`.toast.show` rules matching the
  spec (280px wide, dark bg, white text, monospace, amber border,
  shadow). `src/main.ts` imports `pushToast`, removes the ad-hoc
  `showPickupToast` helper + its `toastTimer`, and on a successful
  `addItem` calls `pushToast("+N Item Name")`. `__voxelTest__` gains
  `toast(text)` so the gate can drive the queue directly.
  `scripts/validate-visual.mjs` P8.2 block pushes 4 toasts via the
  hook, asserts exactly 3 `.toast` elements exist (first 3 visible,
  4th queued), waits up to 4.5s for the 4th to materialise after the
  first fade-out completes, asserts final count is ≤3, captures
  `iter-${ITER}-toast.png`. Build green 524.25 kB (+0.46 kB vs iter
  44's 523.79 kB).

- [x] ~~**P8.3** Time-of-day HUD label (under minimap).~~ (iter 46 —
  `src/ui/hud.ts` exports `setTimeOfDayLabel(phase)` that maps the wrapped
  phase to one of `["Morning", "Noon", "Dusk", "Night"]` via
  `Math.min(3, Math.floor(wrapped * 4))` so the spec bucket boundaries
  (0-0.25 / 0.25-0.5 / 0.5-0.75 / 0.75-1) are exact; skips DOM writes when
  the label hasn't changed. `index.html` adds `<div id="hud-time">Morning</div>`
  directly under the minimap with 150px width matching the minimap, amber
  border + monospace caps so it reads as a sibling chip. `src/main.ts`
  imports `setTimeOfDayLabel`, calls it once on init from
  `dayNight.currentPhase`, then again every `TIME_LABEL_RENDER_EVERY=30`
  frames inside `frame()` next to the minimap tick; the test hook
  `setDayNightPhase` also forces an immediate label refresh so the gate
  doesn't have to wait 30 frames. `scripts/validate-visual.mjs` P8.3 block
  walks all 4 phase buckets (0.1→Morning, 0.4→Noon, 0.6→Dusk,
  0.85→Night) via the test hook and asserts each label round-trips through
  `#hud-time`. Build green 524.58 kB (+0.33 kB vs iter 45's 524.25 kB).

- [x] ~~**P8.4** Animated water + chimney smoke (combined).~~ (iter 47
  — `src/world/waterAnim.ts` `WaterAnimator(worldMesh)` finds the
  `voxel:5` (VOXEL_WATER) InstancedMesh inside the voxel group, snapshots
  per-instance baseY into a Float32Array on construction, and on
  `update(t)` writes `baseY + sin((t + i*0.3) * 1.5) * 0.05` per instance
  with one decompose/compose pass and `instanceMatrix.needsUpdate = true`.
  `src/render/particles.ts` `SmokeEmitter(basePosition)` builds a
  64×64 radial-gray CanvasTexture (sRGB) shared across 16 `THREE.Sprite`s
  with `transparent: true`, `depthWrite: false`. Initial spawn phases are
  staggered by `i * (LIFETIME/SPRITE_COUNT)` so the column reads as a
  continuous trail at t=0 instead of all 16 pulsing in lockstep. Each
  sprite's outward drift direction is fixed at construction
  (`cos(angle)*DRIFT`, `sin(angle)*DRIFT` for `angle = i/16 * 2π`) so the
  trail spreads radially as it rises. `update(t)` recycles by computing
  `age = (t + phaseOffset) mod 4`, then `f = age/4`, writing position
  `(base.x + driftX*f, base.y + 2.5*f, base.z + driftZ*f)`, scale
  `0.5 + f*1.0` (uniform XY), and material opacity `0.7 * (1-f)`.
  `src/main.ts` constructs the emitter at world-coord
  `(gridOffset.x + 32.5, 5, gridOffset.z + 17.5)` (tavern roof centre
  per spec, lifted onto worldMesh's gridOffset), `scene.add(smoke.group)`,
  binds `WaterAnimator(worldMesh)`, and both `smoke.update(t)` +
  `waterAnim.update(t)` fire from the RAF loop right after `worldItems`
  update (same `t = (now - bootMs)/1000` second clock). Test hook
  surfaces `getSmokeSpritePositions()` (16 entries with x/y/z/opacity)
  + `getWaterInstanceYs()` (per-instance Y array). `validate-visual.mjs`
  P8.4 block snaps both arrays, waits 1000ms, snaps again, asserts ≥1
  water Y delta and ≥3 smoke sprite position deltas, captures
  `iter-${ITER}-smoke.png`. Build green 534.27 kB (+9.69 kB vs iter 46's
  524.58 kB — the smoke texture canvas + sprite material overhead).)

- [x] ~~**P8.5** Tavern sign + lamp posts.~~ (iter 48 —
  `src/world/decorations.ts` exports `buildTavernSign(gridOffset)`
  + `buildLampPosts(gridOffset)` + `updateLampPosts(lamps, phase)`
  + `lampIntensityForPhase(phase)`. Sign is a 1.5×0.6
  `PlaneGeometry` with a 256×102 canvas texture (deterministic
  wood-grain horizontal lines + dark brown border + "The Holtwick
  Tavern" in cream serif), positioned at world
  `(gridOffset.x + 32.5, 3, gridOffset.z + 20.05)` so it hangs a
  hair south of the south wall's outer face (TAVERN_ORIGIN_Z +
  TAVERN_INTERIOR_DEPTH + 2 = 14 + 4 + 2 = 20), faces south by
  default since `PlaneGeometry`'s normal is +Z and +Z is south in
  this world's convention. Lamp posts are 4 `InstancedMesh`
  instances of a shared 1×4×1 `BoxGeometry` with a dark
  (`0x2a2520`) `MeshStandardMaterial` placed at cells
  `(29,4)`, `(29,12)`, `(29,44)`, `(29,52)` — west edge of the
  N/S road (cx=32, PATH_HALF=3 → road x=29..35), 8-voxel spacing,
  z values pick out the road segments north of the tavern
  (z=14..19) and south of the plaza ring (z=22..41) so no lamp
  lands inside a building footprint. Each lamp gets a
  `PointLight(0xfff0a0, 0, 6)` placed at world y=4.8 (post top
  minus 0.2 so the bulb reads as glowing from the lantern, not
  hovering above it); intensity is driven by `lampIntensityForPhase`
  — same `-cos(phase·2π) + 0.3` ramp the [[lanterns]] use, capped
  at `LAMP_MAX_INTENSITY=1.2` so the cluster ignites at dusk and
  peaks at midnight in lockstep with the existing tavern/plaza
  lanterns. `src/main.ts` adds the sign mesh + instanced post mesh
  + 4 PointLights to scene, calls `updateLampPosts` once at boot
  and once per RAF tick right after `updateLanterns`, and the
  `?test=1` `setDayNightPhase` hook now drives both update
  functions so the gate doesn't have to wait for animation. New
  test hooks: `getLampIntensities()` returns 4 `{label, intensity}`
  entries; `hasTavernSign()` returns `tavernSign.parent === scene`.
  `scripts/validate-visual.mjs` adds a P8.5 block (right before
  the final runtime-errors check) that warps the cycle to phase
  0.5 (midnight), asserts `hasTavernSign` is true, asserts all 4
  lamps have `intensity > 0` at midnight, captures
  `iter-${ITER}-decorations.png`, then restores phase 0 so any
  later asserts don't see the lights. Build green 536.35 kB
  (+2.08 kB vs iter 47's 534.27 kB — the sign canvas texture +
  shared box geometry + 4-instance matrix array).)

- [x] ~~**P8.6** 4 more item types: `bread` (heal 10), `apple`
  (heal 5), `wooden_sword` (cosmetic, no effect yet), `wooden_shield`
  (cosmetic). Files: extend `src/data/items.ts`, seed 3 of each
  type in world via `village.ts` placement.~~ (iter 49 — `ITEMS`
  grew 3 → 7 with the new corpus (bread heal 10 / apple heal 5 /
  wooden_sword cosmetic / wooden_shield cosmetic), each with distinct
  color + stack caps. New `SEEDED_ITEM_IDS` + `SEEDED_PER_TYPE=3`
  exports drive deterministic placement: `computeItemSpawns` now
  front-loads 3 of each seeded ID via a `tryPlace(itemId)` helper
  before the existing random RNG fills the remaining slots from
  the full 7-item palette. `ITEM_SPAWN_COUNT` bumped 12 → 24
  (12 guaranteed + 12 random) and MAX_ATTEMPTS 500 → 1000 to leave
  headroom. New test hook `getItemDefCount(): number` returns
  `ITEMS.length` (=7). Inventory modal is already generic
  (`ItemDef.name` + color square + count) so the 4 new types render
  automatically when collected. P6.5 reload world-count assert is
  relative pre/post so the bump is transparent; P6.3 pickup harness
  picks the first un-picked spawn regardless of item_id. Build green
  536.98 kB (+0.63 kB vs iter 48).)

- [ ] **P8.7** 3 more quests: deliver-bread (giver: Edda, deliver 1
  bread to baker), talk-to-all (giver: Bren, trigger: talk-to all
  12 NPCs), find-the-spring (giver: well-keeper, trigger: walk into
  a specific hidden cell at the village edge). Files: extend
  `src/data/quests.ts`, may require extending trigger union to add
  `{ type: "deliver"; item_id: string; npc_id: string }` and
  `{ type: "walk_to"; cell: {x:number; z:number}; radius: number }`.

  **Done when:** Playwright accepts each new quest, satisfies its
  trigger via test hooks, asserts completion.

- [ ] **P8.8** Keybind help modal (`?` key opens). Files:
  `src/ui/keyhelp.ts` (new). Modal lists every keyboard control
  with a brief description: WASD (move), Mouse (look — currently
  fixed; placeholder for future), E (interact with NPC), I
  (inventory), ` (FPS overlay), Escape (close modal), Gear icon
  (settings). `?` keydown opens (gated by `isEditableTarget`),
  Escape closes.

  **Done when:** Playwright presses `?`, asserts modal visible with
  ≥6 keybind entries.

## Priority 9 — Voxel polish layer (stack-locked 2026-05-17)

Surface gaps in the voxel/world domain the user spotted after the P6+P7
gameplay+content layers landed. Each item is locked-design, low/medium
risk, mined ONLY after P8.8 lands (loop continues past P8 because P7.8
no longer flips graduation). Final task **P9.6** flips status to
`graduated`.

- [ ] **P9.1** Tavern interior dressing — bar counter + 2 tables +
  4 stools + 1 hearth. Files: `src/world/tavernInterior.ts` (new),
  called from `src/world/village.ts` after `addTavern`.

  **Layout** (tavern interior is the 6×4 plank floor at y=0 from
  `addTavern(originX=28, originZ=14)`, so interior cells run
  x=29..33, z=15..17):
  - **Bar counter**: 3 `VOXEL_PLANKS` cubes at y=1 along the north
    wall, cells (29,15), (30,15), (31,15)
  - **Hearth**: 2 `VOXEL_STONE` cubes at y=1 in the NW corner, cells
    (32,15), (33,15) — plus 1 `PointLight(0xff8030, 0.9, 4)` at world
    pos (gridOffset.x+32.5+0.5, 1.5, gridOffset.z+15.5+0.5) added
    to scene
  - **2 tables**: single `VOXEL_PLANKS` cubes at y=1, cells (30,17)
    and (32,17)
  - **4 stools**: single `VOXEL_DIRT` cubes at y=1, cells (29,17),
    (31,17), (31,17), (33,17) — adjacent to the tables

  Skip stamping if cell is already occupied (defensive — addTavern
  shouldn't have planted anything in the interior, but be safe).

  **Done when:** Playwright loads with the player warped near tavern
  doorway via `__voxelTest__.movePlayerTo(...)`, takes a screenshot;
  the pixel-content bin count rises by >30 vs. baseline (more variety
  inside the tavern voxel space). Also asserts `scene.children` count
  includes 1 more `PointLight` than baseline.

- [ ] **P9.2** Voxel ambient occlusion — vertex-color darken at
  block corners with 2+ solid neighbors (classic Minecraft AO).
  Files: `src/render/voxelMesh.ts` modify the per-instance build to
  emit per-vertex color attribute, computed by sampling 3 neighbor
  cells per corner (the 2 face-adjacent + 1 diagonal). Each "solid
  neighbor" contributes a 0.25 darken factor (clamped to 0.5 min).

  **Implementation:** instead of one `MeshStandardMaterial` per voxel
  type, switch to a single `THREE.BufferGeometry` per type with
  vertex colors enabled (`vertexColors: true` on the material). Build
  the geometry in `voxelMesh.ts` as a quad-per-face mesh (not a
  shared BoxGeometry instance) so per-corner AO can be baked in.
  This is a significant refactor — keep the public API of
  `buildVoxelMesh(grid, palette?)` returning a `THREE.Group` so
  callers don't change.

  **Done when:** Playwright screenshot shows visible darkening at
  tavern wall corners (cells adjacent to plank-wall corner voxels
  should pixel-bin into a darker bucket than the wall's main color).
  Pixel-content top-bin should DROP further (more color variety
  from AO gradients). Build size should not grow more than 10%
  (refactored geometry is roughly equivalent in vertex count).

- [ ] **P9.3** Multi-Y terrain — 3 elevated mini-hills around the
  village outskirts, each a 5×5 cell area raised by 1 voxel (so
  ground at y=0 for the 5×5 footprint becomes `VOXEL_DIRT` capped
  by a `VOXEL_FLOOR` grass cell at y=1, and the y=0 cell becomes
  `VOXEL_DIRT` to look like the slope's substrate).

  Files: `src/world/village.ts` add `addHills(grid, seed)` after
  `computeItemSpawns` (so item spawn list is computed against the
  flat ground; items don't end up perched on hills); `src/entities/player.ts`
  collision needs an auto-step-up rule: if the cell the player is
  trying to enter has a solid voxel at y=1 BUT y=2 is empty AND
  the cell is exactly 1 voxel taller than current player floor,
  ALLOW the move and set player Y to top-of-block + PLAYER_HALF.
  Falling back down works the same in reverse (no gravity yet —
  just snap to top of the cell when leaving a hill).

  **Hill placement:** 3 hills via Mulberry32 seed=villageSeed+9001.
  Reject if center cell is within 5 of plaza, within 3 of any road,
  within 3 of tavern footprint, or within 4 of a tree.

  **Done when:** Playwright screenshot shows visible elevation
  (additional shadow contour); `__voxelTest__.movePlayerTo(<hill
  center>)` followed by reading `__voxelTest__.getPlayerY()` returns
  a Y > baseline ground Y. Player can still walk all original paths
  (regression check: walk to Aldric still completes).

- [ ] **P9.4** Indoor lighting at night — 2 candle PointLights inside
  tavern (above bar, above table-area), plus the hearth PointLight
  from P9.1 should be visible. Files: `src/render/indoorLights.ts`
  (new), called from `src/main.ts`.

  **Candles**: each `PointLight(0xffdc70, 0.6, 3)` at world pos
  derived from cells (30, 16, y=2.5) and (32, 17, y=2.5).
  Hearth from P9.1 stays separate.

  **Intensity ramp:** all 3 indoor lights are CONSTANT (always
  lit, no day/night ramp) — the tavern interior is always lit
  regardless of time of day. This contrasts with P6.10 outdoor
  lanterns that ramp by `dayNight.phase`.

  **Done when:** Playwright loads `?dayNight=0.85` (full night),
  takes a screenshot, asserts a warm-tinted pixel cluster
  (rgb~255,180,80 range) exists within the tavern interior screen
  region. AND a daytime screenshot still shows the interior is
  not blown out (constant lights should be subtle against sunlight).

- [ ] **P9.5** Stars at night — paint 80 white pinprick points on
  the top sky face when `dayNight.phase > 0.7`. Files: extend
  `src/render/sky.ts`.

  **Implementation:** the existing procedural sky is built from
  six 256² canvas faces. Modify `makeFaceCanvas` for the top face
  (`Face.Top`) to accept a `nightAlpha: number` parameter. Paint
  stars only when nightAlpha > 0. Stars are 80 white 1-2px dots at
  fixed seeded positions (mulberry32 seed=42), alpha = nightAlpha.

  **Driving the update:** `DayNight.update()` already runs per
  frame. Subscribe to phase changes; when phase crosses 0.7 or 0.95,
  rebuild the top face canvas with appropriate nightAlpha. Cheap
  (~5ms per rebuild, fires twice per cycle).

  **Done when:** Playwright loads `?dayNight=0.85`, screenshot
  shows >50 distinct white pixels in the top portion of the canvas.
  Daytime screenshot at `?dayNight=0.25` shows zero white pixels
  in the same region.

- [ ] **P9.6** GRADUATION FLIP + final README pass. Files:
  `status.json`, `README.md`.

  **Update README:**
  - Add P9 items to the status table (tavern interior, AO, hills,
    indoor lighting, stars)
  - Bump description if any new mechanics changed (hills means
    "walkable elevation" is now a feature)
  - Final screenshot regeneration via
    `node scripts/capture-showcase.mjs`

  **Flip `status.json` to `"status": "graduated"`** — halts the
  loop per the abandon/graduation signal.

  **Done when:** status.json reflects graduated AND README is
  current. On the next iter check, loop exits cleanly. This is
  the final task for the overnight burn.

## Done (struck through, kept for audit)

P0.1-P0.4 + P1.1-P1.7 + P2.x + P3.1 + P4.0-P4.2 + P4.4 + P5.2 — see
strike-throughs above. Iter history in NOTES.md.
