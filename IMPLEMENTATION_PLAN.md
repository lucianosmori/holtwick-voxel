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

- [ ] **P6.5** Save/load to localStorage. Files: `src/game/save.ts` (new),
  `src/main.ts` wire load-on-boot + auto-save subscription.

  **Format** (single localStorage key `holtwick-voxel:save:v1`):
  ```typescript
  interface SaveV1 {
    version: 1;
    player: { x: number; z: number };
    dayNight: number;
    quests: Record<string, QuestState>;
    inventory: Array<{ item_id: string; count: number }>;
    gold: number;
    saved_at: number;
  }
  ```

  **Auto-save triggers:** every 30 seconds via `setInterval`; on quest
  state change; on item pickup; on dialog close. Coalesce rapid writes
  with a 500ms debounce. **Load on boot:** if save exists and version
  matches, apply to player position + dayNight phase + quests + inventory
  + gold before first frame render. If version mismatches, clear the key
  and start fresh (don't try to migrate).

  **Done when:** Playwright accepts a quest, navigates the page to the
  same URL (forced reload), asserts the quest log shows the accepted
  quest after reload.

- [ ] **P6.6** Second quest: Finn the Smith → collect 3 iron ore. Files:
  extend `src/data/quest.schema.ts` `trigger` union to add
  `{ type: "collect"; item_id: string; count: number }`, add the quest
  to `src/data/quests.ts`, update `src/game/quests.ts` state machine to
  check inventory after every pickup for `collect`-type triggers.

  **Quest:** `id: "finn_iron_ore"`, giver `"finn"`, trigger collect 3
  `iron_ore`, reward 25 gold.

  **Done when:** Playwright accepts Finn's quest, programmatically pushes
  3 iron ore to inventory via a `__voxelTest__.addItem(id, count)` hook,
  opens Finn's dialog, asserts quest auto-completes + 25 gold added.

- [ ] **P6.7** NPC pathing — 3 NPCs walk waypoints. Files:
  `src/entities/npcWalker.ts` (new), `src/data/npcSpawns.ts` add optional
  `path?: Array<{ cellX: number; cellZ: number; pause_sec: number }>` per
  NPC, `src/main.ts` instantiate walkers + tick each frame.

  **Walker behavior:** lerp NPC mesh between consecutive waypoints at
  0.4 units/sec; pause at each waypoint for `pause_sec`; loop forever.
  Halt if player within 3 cells (NPCs "notice" the player). Smooth
  resume when player walks away.

  **Three NPCs assigned paths:**
  - **Edda** — between tavern interior `(32, 17)` and tavern doorway
    `(32, 19)`, pause 3s each
  - **Finn** — between forge spawn and market plaza center, pause 2s each
  - **Bren** — between plaza center and tavern doorway, pause 4s each

  Use existing NPC positions in `npcSpawns.ts` as the starting waypoint.

  **Done when:** Playwright captures screenshot at t=0 and t=10s (page
  evaluate `__voxelTest__.getNpcPosition(id)` at both times), asserts
  the three pathing NPCs' positions differ between snapshots.

- [ ] **P6.8** Procedural ambient audio + footsteps via Web Audio API.
  Files: `src/audio/ambient.ts` (new), `src/audio/footsteps.ts` (new),
  `src/main.ts` wire on first user gesture (audio contexts require a
  gesture to start).

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

- [ ] **P6.9** Trees + foliage. Files: `src/world/foliage.ts` (new),
  `src/world/village.ts` invoke foliage placement after voxel grid is
  built, `src/main.ts` add the foliage group to the scene.

  **Mesh per tree:** 4 stacked dirt-textured cubes for trunk (1×4×1
  voxel, y=0..3) + 8 green-tinted cubes around the top for canopy
  (3×2×3 with corners removed, y=2..4). Use existing `InstancedMesh`
  pattern from `voxelMesh.ts` — one InstancedMesh per material (trunk
  + canopy).

  **Placement:** 30 trees via Mulberry32 (seed = villageSeed + 7331).
  Skip cells where: voxel is non-empty at ground or above; within 2
  cells of road (dirt cells); within 8 cells of plaza (stone center);
  within 3 cells of any NPC spawn; within 3 cells of an item spawn.

  **Done when:** Playwright screenshot shows visible foliage at the
  village edge. The pixel-content top-bin frac drops further than the
  current 15.96% (more color variety).

- [ ] **P6.10** Lantern night lighting. Files: `src/render/lanterns.ts`
  (new), `src/main.ts` wire 4 PointLights with per-frame intensity
  driven by `dayNight.phase`.

  **Lantern positions:** tavern doorway, plaza NE corner, plaza NW
  corner, plaza SE corner. Each: `THREE.PointLight(0xffb070, 0, 6)`
  (warm orange, max intensity 1.5, range 6 voxels).

  **Intensity ramp** (function of `dayNight.phase` where 0 = noon,
  0.5 = sunset, 0.75 = midnight, 1 = dawn): ramp 0 → 1.5 linearly
  across phase 0.55 → 0.75 (sunset), hold 1.5 across 0.75 → 0.95,
  ramp 1.5 → 0 across 0.95 → 1.05 wrap (dawn). Daytime phase ≤ 0.5:
  intensity stays 0.

  **Done when:** Playwright loads `?dayNight=0.85` (full night),
  screenshot shows warm orange light pools on the plaza voxels (assert
  pixel-content includes a bin in the 0xffb070-adjacent range).

- [ ] **P6.11** FPS counter overlay (backtick key toggle). Files:
  `src/ui/hud.ts` extend to add `<div id="fps-overlay">` (bottom-right,
  tiny font, monospace), `src/main.ts` add backtick keydown handler +
  per-frame FPS sampler.

  **Sampler:** rolling 60-frame window; compute fps = 60 / (sum_dt);
  render every 10 frames to avoid jitter.

  **Format:** `60fps · 32 draw · 4.2ms` where draw is `renderer.info.render.calls`
  and ms is the frame time avg.

  **Toggle:** backtick (`` ` ``) keydown toggles visibility. Default
  hidden. Same `isEditableTarget` gate as `I` key.

  **Done when:** Playwright presses backtick, asserts `#fps-overlay`
  becomes visible AND its text contains a numeric fps reading > 0.

- [ ] **P6.12** README v1 + showcase screenshots. Files: `README.md`,
  `scripts/capture-showcase.mjs` (new), `artifacts/screenshots/`.

  **Update README:**
  - Status table: tick everything P6.1 through P6.11
  - New `## Gameplay` section: quests, inventory, save/load mechanics
    briefly explained
  - New `## Screenshots` section linking 4 PNGs:
    `artifacts/screenshots/showcase-village-day.png`,
    `showcase-dialog.png`, `showcase-inventory.png`,
    `showcase-night-lanterns.png` — produced via a new
    `scripts/capture-showcase.mjs` that boots vite preview + visits
    `?test=1` + `?test=1&dayNight=0.85` + drives the dialog + the
    inventory modal, capturing each scene to a named file.

  **Do NOT flip `status.json` to graduated yet.** Graduation moved to
  **P8.8** so the loop keeps mining P7 + P8 work this burn.

  **Done when:** README has the gameplay section, 4 named showcase
  PNGs exist in `artifacts/screenshots/`, capture script is committed.

## Priority 7 — Overnight burn (continued): content + polish layer

Stack-locked 2026-05-16. Layers on top of P6 once gameplay loop ships.
Each iter is locked and self-contained — no "or" choices. Items chosen
to add SURFACE AREA (more content + buildings + NPCs + quests) and
POLISH (settings, idle barks, minimap) without introducing new
mechanics that need design decisions overnight.

- [ ] **P7.1** More buildings: blacksmith forge, village well, 2
  market stalls. Files: `src/world/buildings.ts` (new), called from
  `src/world/village.ts` after `addTavern`.

  **Blacksmith forge** at `(originX=18, originZ=20, doorwayZ=22)`:
  6×6 footprint, plank walls, 1-cell doorway on east side, stone
  anvil (single `VOXEL_STONE` at center).

  **Village well** at `(centerX=46, centerZ=30)`: circular ring of
  `VOXEL_STONE` (radius 2, 1 voxel tall at y=1) with `VOXEL_WATER`
  in the center hole (1×1 at y=0).

  **Market stalls** at `(20, 36)` and `(24, 36)`: 3×2 footprint each,
  4 plank corner posts (y=1..2) supporting a 3×2 plank canopy at y=3.
  No walls, just posts + roof. Open-sided.

  **Done when:** Playwright screenshot shows 4 new structures distinct
  from tavern; pixel-content bin count increases by >50 (more
  voxel surface variety).

- [ ] **P7.2** 5 more tavern NPCs (lifted from existing
  `data/npcs/*.json` corpus). Files: extend `src/data/tavernCast.ts`
  + `src/data/npcSpawns.ts`. Pick 5 NPCs from the 31-NPC corpus whose
  role fits a village (skip "Goblin Berserker" etc.). Suggested:
  `dorin_the_miner`, `hilda_the_herbalist`, `karsten_the_smith`,
  `ronan_the_messenger`, `petra_the_baker` — or substitute equivalents
  if IDs don't exist in the corpus.

  **Spawn positions** (use new buildings from P7.1):
  - smith → at blacksmith doorway `(21, 22)`
  - well-keeper → next to well `(46, 28)`
  - merchant1 → at market stall 1 `(20, 36)`
  - merchant2 → at market stall 2 `(24, 36)`
  - wanderer → on plaza `(28, 32)`

  **Done when:** Playwright `__voxelTest__.getNpcCount()` returns 12
  (was 7 → +5 = 12).

- [ ] **P7.3** Minimap HUD (top-left, 150×150). Files:
  `src/ui/minimap.ts` (new), HUD div in `index.html` + CSS.

  **Render:** 2D canvas, world-to-pixel scale 1 voxel = 2px. Dark
  background `#1a1f2c`. Plot: tavern outline (orange rect), plaza
  (gray rect), road network (dim dirt color), player (yellow dot),
  NPCs (cyan dots), items (small gold dots), lanterns (orange when
  night). Re-draw every 10 frames.

  **Done when:** Playwright screenshot shows a 150×150 div in the
  top-left containing visible distinct dots/rects.

- [ ] **P7.4** Settings menu (gear icon top-right, modal). Files:
  `src/ui/settings.ts` (new), gear icon in `index.html` top-right
  corner (32×32 emoji or SVG).

  **Modal contents:**
  - Master volume slider (binds to P6.8's gain node, persists to
    `holtwick-voxel:audio:volume`)
  - Day-length slider 60-1800 seconds (binds to `dayNight.cycleSeconds`,
    persists to `holtwick-voxel:dayLength`)
  - "Reset save" button (with confirm prompt — clears
    `holtwick-voxel:save:v1`, reloads page)

  Click gear opens modal; Escape or click-outside closes.

  **Done when:** Playwright clicks the gear, asserts modal visible
  with 2 sliders + 1 button.

- [ ] **P7.5** Animated NPC idle barks (proximity-triggered). Files:
  `src/ui/npcBark.ts` (new), called per-frame from `main.ts`.

  **Behavior:** for each NPC within 8 voxels of the player, every
  15-30 seconds (random per-NPC), pick a random string from the
  NPC's `barks_idle[]` and render it as floating text above the NPC
  for 4 seconds (CSS-positioned div with `transform: translate(...)`
  mapping world→screen coords each frame; fade-in 200ms, hold 3500ms,
  fade-out 300ms). Skip if player is in dialog with that NPC.

  No LLM call — pure data from `barks_idle` in `npcSpawns.ts` /
  `tavernCast.ts`.

  **Done when:** Playwright walks player to within 8 voxels of an
  NPC via `__voxelTest__.movePlayerTo()`, waits 30s, asserts at
  least one `.npc-bark` element appeared in the DOM with non-empty
  text content matching one of the NPC's idle barks.

- [ ] **P7.6** Quest 3 — "Visit the well" (talk-to type). Files:
  add to `src/data/quests.ts`, giver = well-keeper NPC from P7.2.
  `id: "well_visit"`, trigger `talk_to` well-keeper from inside a
  3-cell radius of well center, reward 5 gold.

  Demonstrates that any NPC can be a quest-giver, not just Edda.

  **Done when:** Playwright accepts quest from well-keeper, then
  re-opens dialog, asserts auto-completion + 5 gold awarded.

- [ ] **P7.7** Quest 4 — "Collect 5 gold coins" (collect type).
  Files: add to `src/data/quests.ts`, giver = Bren the bard,
  `id: "bren_5_coins"`, trigger collect 5 `gold_coin`, reward 1
  `health_potion`.

  Demonstrates non-gold rewards (item rewards land in inventory).
  Extends P6.5's `reward` schema to support `{ items?: Array<{ item_id, count }> }`.

  **Done when:** Playwright accepts Bren's quest, pushes 5 gold_coin
  via `__voxelTest__.addItem`, opens dialog, asserts quest completion
  + 1 health_potion in inventory.

- [ ] **P7.8** README v2 + GRADUATION FLIP. Files: `README.md`,
  `status.json`.

  **Update README:**
  - Status table fully ticked (everything through P7.7)
  - Roster section: list all 12 NPCs + their roles
  - Controls section: WASD, mouse, E (interact), I (inventory),
    ` (FPS overlay), Escape (close), gear icon (settings)
  - Recap of quest count + item count + building count
  - Link to live demo + screenshot gallery

  **Flip `status.json` to `"status": "graduated"`** — this halts the
  loop per the abandon/graduation signal.

  **Done when:** status.json reflects graduated AND the README has
  the full controls + roster sections. On the next iter check, loop
  exits cleanly.

## Priority 8 — Extra overshoot (only mined if P6 + P7 land early)

Stack-locked 2026-05-16. Pure content/visual/HUD additions, zero new
mechanics. Each safe to skip — none are graduation-blocking. If ralph
finishes P7.8 (graduation), the loop stops and P8 stays unmined.

- [ ] **P8.1** Decorative props: barrels + crates instanced near
  buildings. Files: `src/world/props.ts` (new), instanced cubes
  with plank texture, 20 props seeded around tavern/forge/well/stalls.
  Skip cells on roads, in plaza center, inside buildings.

  **Done when:** Playwright screenshot shows visible plank barrels/crates
  adjacent to at least 2 of the 4 new building locations.

- [ ] **P8.2** Toast notification system (animated bottom-center).
  Files: `src/ui/toast.ts` (new), CSS in `index.html`. Replaces the
  ad-hoc "+1 Iron Ore" text spam from P6.3 with a styled slide-in
  toast: 280px wide, dark background, white text, fades from
  `transform: translateY(40px)` to `translateY(0)` over 250ms, holds
  2.5s, fades back out 250ms. Queue: max 3 visible at once, stack
  vertically.

  **Done when:** Playwright pushes 4 events via `__voxelTest__.toast("test")`
  in quick succession, asserts 3 visible `.toast` elements at any
  given moment, 4th appears after the first fades.

- [ ] **P8.3** Time-of-day HUD label (under minimap). Files: extend
  `src/ui/hud.ts`. Shows "Morning" (0.0-0.25), "Noon" (0.25-0.5),
  "Dusk" (0.5-0.75), "Night" (0.75-1.0) based on `dayNight.phase`.
  Update every 30 frames.

  **Done when:** Playwright loads `?dayNight=0.85`, asserts HUD shows
  "Night".

- [ ] **P8.4** Animated water + chimney smoke (combined). Files:
  `src/world/waterAnim.ts` (new), `src/render/particles.ts` (new),
  hooks into main RAF loop.

  **Water:** per-frame Y-jitter on water `InstancedMesh` instances:
  `y = baseY + sin((t + i * 0.3) * 1.5) * 0.05`. Subtle bob.

  **Chimney smoke:** Sprite-batched 16 fade-up gray sprites above
  the tavern roof at `(32, 5, 17)` (tavern center top). Each sprite
  lifecycles 4s: spawn at base, drift up + slightly outward, scale
  up 0.5→1.5x, opacity 0.7→0. Recycle.

  **Done when:** Playwright captures 2 screenshots 1s apart; asserts
  at least 3 pixels at chimney coord differ between frames (smoke
  motion) AND at least 1 water voxel y-position differs.

- [ ] **P8.5** Tavern sign + lamp posts. Files:
  `src/world/decorations.ts` (new).

  **Tavern sign:** billboard plane (1.5×0.6) at tavern doorway
  height 3, with a canvas-rendered "The Holtwick Tavern" text on a
  wood-grain background. Faces south.

  **Lamp posts:** 4 instanced cubes (1×4×1) along the main road,
  spaced every 8 voxels. Each lamp gets a small PointLight at the
  top (color `0xfff0a0`, intensity ramping with `dayNight.phase`
  like P6.10's tavern lanterns).

  **Done when:** Playwright screenshot at night shows the tavern
  sign legible AND warm light pools from the 4 lamp posts along
  the road.

- [ ] **P8.6** 4 more item types: `bread` (heal 10), `apple`
  (heal 5), `wooden_sword` (cosmetic, no effect yet), `wooden_shield`
  (cosmetic). Files: extend `src/data/items.ts`, seed 3 of each
  type in world via `village.ts` placement.

  **Done when:** Playwright `__voxelTest__.getItemDefCount()` returns
  7 (was 3 → +4 = 7); inventory modal renders all 7 item types if
  collected.

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

## Done (struck through, kept for audit)

P0.1-P0.4 + P1.1-P1.7 + P2.x + P3.1 + P4.0-P4.2 + P4.4 + P5.2 — see
strike-throughs above. Iter history in NOTES.md.
