# 07-fp-overnight-roguelike-3d

Auto-promoted from POC_BACKLOG.md on 2026-05-12 by user-initiated promote (Telegram OK 2026-05-12).

## Source backlog entry

- **Source:** Direct follow-up to abandoned `02-fp-overnight-roguelike` (Phaser version shipped technically but rejected on aesthetic). The "or" choice in the prior backlog let ralph auto-pick Phaser; this entry removes the ambiguity.
- **Hypothesis:** A 9-12h Opus 4.7 ralph burn with the stack **locked to Three.js + voxel terrain + PixelLab pixflux textures from iter 1** produces a rogue-like that actually matches the user's mental model, reusing the NPC schema and WebLLM chat code from `02-fp-overnight-roguelike/src/data` and `src/chat`.
- **Minimal first move:** Day-1 spec lock (no "or" choices). Renderer: Three.js r160+. Terrain: voxel-style cubes (no mesh import — built from arrays). NPC sprites: PixelLab pixflux 4-direction billboards facing camera, or full voxel models if time permits. Camera: top-down 3D with slight tilt (à la Diablo). First slice: walkable voxel floor + WASD + camera follow.
- **Promotion criteria:** Playable in browser; ≥3 procedural levels; ≥10 NPCs each with PixelLab textures; deployable to GH Pages; user sees the first build and says "yes that's what I had in mind."
- **Lift from abandoned 02-fp:** `npc.schema.ts`, all 31 NPC JSONs, `chat/webllm.ts` (port verbatim), `audio/sfx.ts`. Do NOT lift WorldScene / floor.ts / sprite.ts — voxel renderer is a clean rewrite.
- **Risk:** Three.js learning curve + voxel terrain + procedural gen + PixelLab integration in one burn is more aggressive than the Phaser version was. Plan a "spec-lock checkpoint" after iter 1: user reviews the iter-1 sharpened plan before iter 2 fires. Don't over-promise 50 NPCs — start with 10.

## Status

`exploring` -- auto-promoted; ralph will drain `IMPLEMENTATION_PLAN.md` until graduated or abandoned. See `NOTES.md` for the running journal.
