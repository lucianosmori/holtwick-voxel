# NOTES.md

Running journal for this experiment. One line per iteration. Free-form entries above the iteration log for discoveries, dead-ends, decisions.

## Discoveries & decisions

<!-- Write here when something surprises you or when you change direction. Dated. Kept forever — this is the post-mortem source material. -->

- **2026-05-12 — iter 1 spec lock.** Confirmed `../02-fp-overnight-roguelike/src/` has the 5 lift targets intact: `data/npc.schema.ts`, `data/npcs.ts`, 31 JSONs under `data/npcs/`, `chat/webllm.ts`, `audio/sfx.ts`. Three.js version pinned to `^0.160` (latest stable in `02-fp` ecosystem; r160 is widely covered in WebGL2 examples). PixelLab integration deferred to P2 as a Node tool, not a runtime dep, to keep iter scope honest.
- **Stack rationale (KISS, official-first):** Three.js is first-party from mrdoob/three; Vite is the official build path for browser TS; PixelLab is the only third-party for sprites and is run offline. No React-three-fiber wrapper — would add learning surface + bundle weight without value at this scale.
- **Why P1.7 is a hard checkpoint:** Per backlog risk register, the user wants to eyeball the first playable before ralph burns into procedural + chat. GH Pages URL in hand is the signoff trigger.
- **2026-05-13 — iter 13 visual-gate gotcha.** Initial Playwright run passed with zero console errors but the saved screenshot was solid black. Root cause: `THREE.WebGLRenderer` defaults `preserveDrawingBuffer: false`; Chromium's compositor clears the WebGL drawing buffer right after compositing, so a screenshot taken outside the renderer's RAF tick gets a wiped canvas. Fixed by enabling `preserveDrawingBuffer: true` only when the page is loaded with `?test=1` (so prod keeps the perf-friendly default). `validate-visual.mjs` always navigates to `?test=1`. **Lesson:** a "no console errors" + "canvas present" + "screenshot saved" pass is NOT sufficient validation on its own — the visual diff trail is what catches the silent-blank regression. Worth adding pixel-content asserts in a follow-up.

- **2026-05-12 — iter 12 deploy decision.** Repo only has one GH Pages site, already wired by `.github/workflows/pages.yml` for `02-fp-overnight-roguelike`. Instead of inventing a second workflow / `gh-pages` branch (would fight for the same Pages source), extended the existing workflow to build both POCs and combine into one artifact: 02-fp at root, 07 under `/07-fp-overnight-roguelike-3d/`. Vite `base: "./"` already produces relative asset paths so the subdir mount works without further config. **Live URL (post-deploy):** `https://lucianosmori.github.io/poc-fiesta-2026-05/07-fp-overnight-roguelike-3d/` — verify in browser, then signoff for P2.

## Iteration log

<!-- Appended by the loop. Format: `iter N | <done|blocked|skipped> | <one-sentence why>` -->
iter 1 | done | sharpened PROMPT objective + replaced TBD plan with 4 P0 / 7 P1 / 7 P2 tasks
iter 2 | done | P0.1 Vite+TS+three@0.160 scaffold; `npm run build` green (tsc --noEmit + vite build, 296ms)
iter 3 | done | P0.2 lifted npc.schema.ts + npcs.ts + 31 JSONs verbatim; added tsx-based `npm run check:data` (31 ok); build still green
iter 4 | done | P0.3 lifted chat/webllm.ts + audio/sfx.ts verbatim from 02-fp; build + data check green; not yet wired into runtime per spec
iter 5 | done | P0.4 three.js bootstrap: render/scene.ts (Scene + perspective cam @55°pitch + WebGLRenderer + resize) + RAF loop + rotating ref cube; build green (454 kB)
iter 6 | done | P1.1 VoxelGrid (Uint8Array, get/set/dims, EMPTY/FLOOR/WALL consts); OOB get returns empty for collision safety; build green
iter 7 | done | P1.2 buildVoxelMesh: per-type InstancedMesh sized by exact non-empty counts, shared BoxGeometry, default palette (floor/wall MeshStandardMaterial); build green
iter 8 | done | P1.3 buildStarterRoom() builds 32×1×32 floor-fill with WALL perimeter; main.ts renders it centered at origin in place of the rotating cube; build green (458 kB)
iter 9 | done | P1.4 Player class (0.6³ cube, WASD+arrows, axis-separated AABB collision vs VOXEL_WALL across full footprint) wired into main.ts RAF with capped dt; build green (460 kB)
iter 10 | done | P1.5 camera follow: each frame copy player pos + CAMERA_OFFSET, lookAt(player); build green (460 kB)
iter 11 | done | P1.6 BillboardNpc (PlaneGeometry 1×1.5 + canvas-texture MeshBasicMaterial, Y-axis-only lookAt) spawned at cell (16,22); build green (461 kB)
iter 12 | checkpoint | P1.7 extended `.github/workflows/pages.yml` to build 07 alongside 02 and mount it at `/07-fp-overnight-roguelike-3d/`; local build green; SPEC-LOCK — loop must halt for user signoff at `https://lucianosmori.github.io/poc-fiesta-2026-05/07-fp-overnight-roguelike-3d/`
iter 13 | done | P2.0 Playwright validation gate online — `scripts/validate-visual.mjs` (vite preview + chromium headless + screenshot + console-error guard), `npm run validate:visual`, loop.ps1/.sh prompt + post-iter gate; first uncovered issue: WebGL `preserveDrawingBuffer` (now URL-`?test=1`-gated in scene.ts) — visual gate was silently passing on cleared-canvas blank screenshots before the fix. iter-13.png confirms room+player+NPC render.
iter 14 | done | P2.0b pixel-content assert added to validate-visual.mjs — downsamples canvas#game to 512px long edge, bins colors at 5-bit/channel via getImageData, fails on >99% single-bin. Current build reads 67.43% top-bin / 51 bins; blank-canvas regression would read 100% / 1 bin and trip the gate. iter-14.png artifact captured.
iter 15 | done | P2.1 Kenney mini-block textures wired into voxelMesh — palette entries carry `textureUrl?` loaded via Vite `?url`+`TextureLoader` (cached, NearestFilter+SRGB+Repeat), grass/stone/dirt/planks PNGs from `assets/voxel/PNG/{Green,Light,Dark,Orange}/`, water keeps flat 0x3a6da6 (pack has no blue). New voxel-type consts DIRT=3/PLANKS=4/WATER=5 added. iter-15.png shows textured grass floor + stone walls; top-bin 67.4%→41.8%, bins 51→152.
iter 16 | done | P2.2 lighting: HemisphereLight(0xbcd6ff/0x4a3a2a, 0.4) + DirectionalLight(0xffeecc, 1.2) at (-18,30,-18) targeting origin; PCFSoftShadowMap on with sun ortho-frustum ±22, 2048² map, bias -5e-4; voxel instanced meshes + player opt into cast+receive shadow (NPC plane skipped — flat-shadow ugliness). Visual gate: top-bin 41.8%→37.15%, bins 152→165; iter-16.png shows player shadow on floor + warm-cool gradient on stone walls.
