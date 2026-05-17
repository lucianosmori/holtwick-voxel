# Holtwick Voxel

3D voxel rogue-like set in the Holtwick Tavern world. Three.js renderer, cloud-LLM NPCs (Cloudflare Worker -> Groq Llama-3.1-8B), procedural voxel village with day/night, quests, and a tavern at the center.

**Play it →** https://lucianosmori.github.io/holtwick-voxel/

Companion to [holtwick-tavern](https://github.com/lucianosmori/holtwick-tavern) (2D web chat with the same 31 NPCs).

## Status

Early access. The village world, lighting, shadows, sky, tavern building, and Playwright visual-validation gate are in place. NPC pixel-art sprites and dialog UI are next.

| Slice | State |
|---|---|
| Voxel renderer + textures (Kenney CC0) | ✅ |
| Procedural village floor (grass/dirt/stone/water) | ✅ |
| Tavern building (plank walls, doorway) | ✅ |
| Player movement + camera follow + collision | ✅ |
| Lighting + shadows + sky | ✅ |
| NPC pixel-art sprites (31, via PixelLab) | ⏳ blocked on credits |
| NPC dialog modal (Cloudflare/Groq, cross-browser) | ✅ |
| Per-NPC TTS | ⏳ planned |
| Day/night cycle, quests, inventory | ⏳ planned |

Iteration history in [`NOTES.md`](./NOTES.md); active task list in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

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
- **World:** 64×1×3 voxel grid (`Uint8Array`), procedural village generator (deterministic seed), procedural cube-sky background
- **Lighting:** `HemisphereLight` + `DirectionalLight` with PCF soft shadows
- **NPCs:** `PlaneGeometry` billboards facing the camera (Y-axis only), 31 lifted from holtwick-tavern with persona + voice + dialog seeds
- **Chat:** Cloudflare Worker ([holtwick-llm-proxy](https://github.com/lucianosmori/holtwick-llm-proxy)) -> Groq `llama-3.1-8b-instant`. Cross-browser, no client-side model download, $0/month on free tiers. Per-NPC history capped at 12 turns, scripted-bark offline fallback.
- **Validation:** Playwright headless Chromium gate in every iter — screenshot to `artifacts/screenshots/iter-NN.png`, pixel-content assert (catches blank-canvas regressions), console-error guard

## License

MIT. Voxel textures from [Kenney Prototype Textures](https://kenney.nl/assets/prototype-textures) (CC0).
