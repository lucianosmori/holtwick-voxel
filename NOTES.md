# NOTES.md

Running journal for this experiment. One line per iteration. Free-form entries above the iteration log for discoveries, dead-ends, decisions.

## Discoveries & decisions

<!-- Write here when something surprises you or when you change direction. Dated. Kept forever — this is the post-mortem source material. -->

- **2026-05-12 — iter 1 spec lock.** Confirmed `../02-fp-overnight-roguelike/src/` has the 5 lift targets intact: `data/npc.schema.ts`, `data/npcs.ts`, 31 JSONs under `data/npcs/`, `chat/webllm.ts`, `audio/sfx.ts`. Three.js version pinned to `^0.160` (latest stable in `02-fp` ecosystem; r160 is widely covered in WebGL2 examples). PixelLab integration deferred to P2 as a Node tool, not a runtime dep, to keep iter scope honest.
- **Stack rationale (KISS, official-first):** Three.js is first-party from mrdoob/three; Vite is the official build path for browser TS; PixelLab is the only third-party for sprites and is run offline. No React-three-fiber wrapper — would add learning surface + bundle weight without value at this scale.
- **Why P1.7 is a hard checkpoint:** Per backlog risk register, the user wants to eyeball the first playable before ralph burns into procedural + chat. GH Pages URL in hand is the signoff trigger.

## Iteration log

<!-- Appended by the loop. Format: `iter N | <done|blocked|skipped> | <one-sentence why>` -->
iter 1 | done | sharpened PROMPT objective + replaced TBD plan with 4 P0 / 7 P1 / 7 P2 tasks
iter 2 | done | P0.1 Vite+TS+three@0.160 scaffold; `npm run build` green (tsc --noEmit + vite build, 296ms)
iter 3 | done | P0.2 lifted npc.schema.ts + npcs.ts + 31 JSONs verbatim; added tsx-based `npm run check:data` (31 ok); build still green
iter 4 | done | P0.3 lifted chat/webllm.ts + audio/sfx.ts verbatim from 02-fp; build + data check green; not yet wired into runtime per spec
iter 5 | done | P0.4 three.js bootstrap: render/scene.ts (Scene + perspective cam @55°pitch + WebGLRenderer + resize) + RAF loop + rotating ref cube; build green (454 kB)
iter 6 | done | P1.1 VoxelGrid (Uint8Array, get/set/dims, EMPTY/FLOOR/WALL consts); OOB get returns empty for collision safety; build green
