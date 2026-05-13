# IMPLEMENTATION_PLAN.md

> Disposable. Drained top-down by the loop, one item per iteration. Strike finished items with `~~...~~`. Add new items discovered during work at the appropriate priority.

## Priority 0 — Must complete first (scaffolding, no rendering yet)

- [x] ~~**P0.1** Initialize Vite + TypeScript project: copy `package.json` shape from `../02-fp-overnight-roguelike/`, drop `phaser`, add `three@^0.160` and `@types/three`. Add `tsconfig.json`, `vite.config.ts`, `index.html` (single `<canvas id="game">`, no UI yet), `src/main.ts` (empty entrypoint that logs "boot ok"). Add `.gitignore` for `node_modules/` and `dist/`. Run `npm install` and verify `npm run build` (tsc --noEmit + vite build) passes.~~ (iter 2)
- [x] ~~**P0.2** Lift NPC data verbatim: copy `../02-fp-overnight-roguelike/src/data/npc.schema.ts`, `data/npcs.ts`, and all 31 files in `data/npcs/*.json` into `src/data/`. Do NOT modify contents. Add a smoke test in `src/data/npcs.test.ts` (or a `npm run check:data` script) that imports the loader and asserts 31 NPCs validate against the schema.~~ (iter 3 — `npm run check:data` via tsx; 31 NPCs validate; `npm run build` still green)
- [x] ~~**P0.3** Lift `chat/webllm.ts` and `audio/sfx.ts` verbatim from `../02-fp-overnight-roguelike/src/` into `src/chat/` and `src/audio/`. Add `@mlc-ai/web-llm@^0.2.83` to deps. Confirm `tsc --noEmit` still passes — do NOT wire these into the runtime yet, just make them compile.~~ (iter 4 — files copied byte-for-byte; `@mlc-ai/web-llm@^0.2.83` already in deps from iter 2; `npm run build` + `npm run check:data` both green)
- [x] ~~**P0.4** Three.js bootstrap: `src/render/scene.ts` creates `Scene`, `PerspectiveCamera` (fov 55, pitched ~55° looking down), `WebGLRenderer` attached to `#game`. `src/main.ts` calls bootstrap, starts a `requestAnimationFrame` loop that clears + renders, handles `window.resize`. Add a single rotating reference cube at origin so we can eyeball that rendering works.~~ (iter 5 — scene/camera/renderer + RAF loop + resize handler + rotating ref cube; `npm run build` green, 454 kB bundle)

## Priority 1 — First playable slice (single-room walkable demo)

- [ ] **P1.1** Voxel grid module `src/world/voxel.ts`: `VoxelGrid` class backed by `Uint8Array`, with `get(x,y,z)`, `set(x,y,z,v)`, `dims`. `0` = empty, `1` = floor, `2` = wall. Pure data, no rendering.
- [ ] **P1.2** Voxel renderer `src/render/voxelMesh.ts`: takes a `VoxelGrid`, builds one `InstancedMesh` per voxel type using shared `BoxGeometry(1,1,1)` and palette materials. Returns a `THREE.Group`. Re-buildable on demand; not optimized for streaming yet.
- [ ] **P1.3** Hand-authored 32×1×32 single-room layout: floor everywhere, walls on the 4 outer edges, in `src/world/rooms.ts` as `buildStarterRoom(): VoxelGrid`. Wire it into `main.ts`, replacing the rotating cube.
- [ ] **P1.4** Player avatar `src/entities/player.ts`: a single colored `Mesh` (cube for now) with `position`, `velocity`. WASD input from `KeyboardEvent`, axis-aligned movement on XZ at constant speed. Wall collision against the `VoxelGrid` (AABB vs occupied cells). No jumping.
- [ ] **P1.5** Camera follow: in the main loop, each frame set `camera.position = player.position + cameraOffset`, `camera.lookAt(player.position)`. Tunable offset constant in `src/render/scene.ts`.
- [ ] **P1.6** Billboard NPC `src/entities/npc.ts`: `PlaneGeometry(1,1.5)` with a placeholder canvas-generated texture (single solid color + label). Spawn one NPC at a fixed cell in the starter room. Each frame `mesh.lookAt(camera.position)` constrained to Y axis only.
- [ ] **P1.7** GH Pages deploy workflow `.github/workflows/deploy.yml`: build on push to main, publish `dist/` to `gh-pages` branch. Configure `vite.config.ts` `base` for the repo path. First deploy must serve the P1 build successfully — link goes into NOTES.md. **SPEC-LOCK CHECKPOINT: stop here and surface the live URL to the user before iter on P2.**

## Priority 2 — Hypothesis validation (procedural + chat + sprites)

- [ ] **P2.1** PixelLab pixflux script `tools/genSprites.ts` (Node, not bundled): reads NPC JSONs, calls PixelLab API, writes `public/sprites/<id>_<dir>.png` for 4 directions. Env-gated (`PIXELLAB_API_KEY`); skip-if-exists by default. Document run instructions in NOTES.md.
- [ ] **P2.2** Wire real sprites: NPC billboard loads `public/sprites/<id>_<dir>.png` via `TextureLoader`, picks direction texture from yaw quadrant relative to camera. Fall back to placeholder if missing.
- [ ] **P2.3** Procedural dungeon gen `src/world/gen.ts`: simple BSP or rooms+corridors, deterministic seed. Replaces `buildStarterRoom` with `generateLevel(seed)`. Spawn 10 NPCs at random walkable cells (sampled from the 31 NPCs).
- [ ] **P2.4** Stairs + multi-level: spawn a stair voxel type; player overlap loads next seeded level. ≥3 levels reachable.
- [ ] **P2.5** Chat overlay UI `src/ui/chat.ts`: raycast on click from camera through cursor → NPC. Open HTML overlay, pipe text through `chat/webllm.ts`. Stream tokens into the overlay; close on Esc.
- [ ] **P2.6** SFX hookup: wire `audio/sfx.ts` to footstep + chat-open events. Volume slider in overlay.
- [ ] **P2.7** Polish: title screen, level counter HUD, simple death/restart on falling off the map (if ever).

## Done (struck through, kept for audit)

<!-- Move completed items here or strike in place. -->
