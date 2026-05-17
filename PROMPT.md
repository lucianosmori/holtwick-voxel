# PROMPT.md -- stable spec for 07-fp-overnight-roguelike-3d

> Auto-generated from POC_BACKLOG.md. Refine the **first iteration** if the spec is too thin.

## Objective (sharpened iter 1, 2026-05-12)

**Build a top-down 3D rogue-like in the browser with the stack locked from day 1.** No "or" choices, no engine swaps, no aesthetic re-litigation.

**Stack (locked):**
- Vite 5 + TypeScript 5 (mirror `02-fp-overnight-roguelike/package.json` minus Phaser).
- Three.js `^0.160` for rendering. No `@react-three/*`, no `three-mesh-bvh`, no other 3D libs.
- NPC chat via Cloudflare Worker -> Groq `llama-3.1-8b-instant` (see `src/chat/proxy.ts` + repo `lucianosmori/holtwick-llm-proxy`). **WebLLM was removed 2026-05-16** — do NOT reintroduce `@mlc-ai/web-llm`.
- World = voxel cubes built from `Uint8Array` grids + `THREE.InstancedMesh`. Never load external `.glb`/`.fbx` meshes.
- NPCs = textured plane billboards (`PlaneGeometry` + `MeshBasicMaterial`, `material.map = texture`, `lookAt(camera.position)` each frame). 4-direction PixelLab pixflux PNGs swapped by yaw quadrant.
- Camera = perspective, top-down with ~55° pitch (Diablo-ish), follows player on XZ.

**Lift verbatim from `../02-fp-overnight-roguelike/src/` into `src/`:**
- `data/npc.schema.ts`
- `data/npcs/*.json` (all 31)
- `data/npcs.ts` (loader)
- ~~`chat/webllm.ts`~~ (removed 2026-05-16 — chat now in `src/chat/proxy.ts`)
- `audio/sfx.ts`

**Do NOT lift:** `scenes/`, `render/`, `world/`, `entities/`, `gen/`, `items/`, `main.ts`, `ui/`. All clean rewrites for 3D.

**First playable slice (target by P1 completion):**
- Open dungeon room (~32×32 voxel floor + walls) rendered with InstancedMesh.
- Player cube, WASD movement, camera follow.
- 1 billboard NPC placed in the room with a placeholder texture, faces camera.
- No procedural gen, no chat, no multi-level — those land in P2.

**Promotion criteria (graduation):**
- Playable build deployed to GH Pages.
- ≥3 procedurally generated levels with stairs between them.
- ≥10 NPCs spawned with PixelLab-generated textures (real, not placeholder).
- Click-an-NPC opens WebLLM chat overlay.
- User reviews the build and confirms "yes that's what I had in mind."

**Spec-lock checkpoint:** After P0 tasks complete and iter 2 begins on P1, the user reviews this sharpened plan before further iterations burn. Loop should not auto-promote past P1 without status.json reflecting user-visible progress.

**Hard caps to prevent scope creep:**
- 10 NPCs in the first playable, not 31. Remaining 21 are P2.
- Single dungeon layout in P1; multi-level moves to P2.
- PixelLab integration is a separate script under `tools/`, not in the runtime bundle. Outputs `.png` files committed under `public/sprites/`.

**Risk register:**
- Three.js learning curve compounded with voxel rendering and procedural gen → mitigated by P0 covering only scaffolding + lifts, P1 only flat-room + WASD + 1 billboard.
- PixelLab API quota / cost → script writes to disk; re-runs only on demand, never per-iteration.
- Identity drift between sprite generations (see [[feedback_face_fidelity_multi_clip]]) — punted; not in P0/P1.

## Tonight's backlog (2026-05-16 stack-locked, plan tender-twirling-hopper)

P6.1 through P6.12 in `IMPLEMENTATION_PLAN.md` is the overnight burn:
gameplay loop (quests + inventory + save/load) then atmosphere (NPC
pathing + procedural audio + trees + lanterns + FPS overlay + README).
Take them in order. Earlier priorities P4.3 (DEFERRED) + P4.5/P4.6/P5.x
are explicitly superseded — do NOT pick them up. PixelLab P3.1b-P3.3
remain BLOCKED, skip them.

Per-iter validation gate (LOCAL): `npm run build` must pass before commit
(tsc --noEmit + vite build). Do NOT run `npm run validate:visual` or
`npm run test:dialog` locally — those moved to GitHub Actions
(`.github/workflows/visual-validation.yml`) on 2026-05-17 to spare the
user's machine from Playwright. They run automatically on every push.
The loop.ps1 wrapping you waits for that CI check via `gh run watch`
and halts the burn if the check fails, so visual regressions still gate
forward progress — they just gate it from the cloud.

Push after each commit (repo is public, content is ungated —
`feedback_always_push.md`).

## Working rules

- Read `IMPLEMENTATION_PLAN.md`. Pick the single highest-priority unfinished task. Work ONLY on that.
- Before writing code: search this folder for existing implementations. Don't re-implement.
- No placeholder code. No TODOs in committed code. Split the task smaller if you can't finish in one iter.
- Run whatever tests/lint/typecheck the stack requires before committing. Commit only on green.
- Commit message convention: `ralph(iter N): <what>`.
- Update `IMPLEMENTATION_PLAN.md`: strike the finished item. Add follow-ups at the right priority.
- Append one line to `NOTES.md`: `iter N | <done|blocked|skipped> | <one-sentence why>`.
- Update `status.json`: increment iteration, set last_outcome, set updated_at.
- (no scope restrictions on writes outside this folder -- ralph has free rein per user instruction 2026-05-10)
- Do not modify `PROMPT.md`, `loop.ps1`, `loop.sh`, or this file.

## First-iteration directive

The first iter should:
1. Read the backlog body above and design the smallest first slice.
2. Replace this PROMPT.md's Objective section with a sharper, agent-friendly restatement.
3. Replace IMPLEMENTATION_PLAN.md's TBD placeholders with 5-15 concrete tasks across Priority 0/1/2.
4. Commit as `ralph(iter 1): scaffold prompt + plan from backlog entry`.

## Definition of done (graduation signal)

`status.json` contains `"status": "graduated"`. The loop greps `"status"\s*:\s*"(graduated|abandoned)"` to stop.

## Abandon signal

`status.json` contains `"status": "abandoned"` OR `consecutive_no_progress >= 5`.
