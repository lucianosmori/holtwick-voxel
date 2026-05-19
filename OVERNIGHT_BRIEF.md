# Overnight Visual Pass — Characters Less Cube-Like

**User asked (2026-05-19 ~23:00):** Work overnight autonomously to make characters look "significantly less cube-like." Will check back in morning.

## Diagnosis
- **Player** = literal `THREE.BoxGeometry(0.6,0.6,0.6)` in `src/entities/player.ts:39` → a single cube.
- **NPCs** = flat 32×48 pixel-art billboarded planes via `src/render/proceduralSprite.ts` → look like flat cards.
- Both read as "cubes" in a voxel world.

## Plan (iterate, validate each step with Playwright)

1. **Multi-part player mesh** — replace single box with grouped head/torso/arms/legs primitives. Use slightly rounded boxes (segmented BoxGeometry or CapsuleGeometry) for limbs. Preserve `mesh.position` and collision (collision stays at PLAYER_SIZE; visual is decorative).
2. **Multi-part NPC mesh** — replace billboard plane with same kind of grouped primitive body, colored by existing palette. Keep `proceduralSprite.ts` palette logic; just use it for materials instead of canvas pixels.
3. **Subtle limb animation** — bobbing/walk cycle on motion (sin-based, very cheap).
4. **Head detail** — small sphere for head, tiny boxes for eyes, optional hair cap.
5. **Validation** — Playwright screenshots via `ITER=character-N node scripts/validate-visual.mjs` each step.
6. **PR** — When done (and only when build/tsc green), open a single PR with screenshot evidence. User has explicitly OK'd PRs (overrides earlier no-PR rule, per memory).

## Constraints
- Don't touch collision geometry / movement logic — only visual mesh.
- Don't break existing day/night, lanterns, fog, bloom (recent visual pass features).
- Keep performance: NPCs are many — use shared geometries/materials per palette where possible.
- Commit only on green build + tsc clean for modified files.
- Branch: `hermes/visual-pass` (was merged via PR #1; create new branch `hermes/characters` for this pass).

## Iteration log
(update each iteration)
