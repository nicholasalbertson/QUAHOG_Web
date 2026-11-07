# Borden content pack

Source archive: `Borden_content_upgrades.zip` (uploaded 2026-11-07).

| File | Role | Notes |
|------|------|-------|
| `public/models/lizzie.glb` | Character | Meshopt-compressed; no embedded walk cycle |
| `public/models/remington_borden.glb` | Character | Meshopt-compressed; no embedded walk cycle |
| `public/models/previews/lizzie_preview.png` | UI | Character menu thumbnail |
| `public/models/previews/remington_borden_preview.png` | UI | Character menu thumbnail |

Registered in `src/assets/modelRegistry.ts` and `public/models/manifest.json`.
Selectable in the Character menu; ambient pedestrians sample the full cast.
License rows: `public/assets-licenses.json` + `docs/ASSET-LICENSE-AUDIT.md`.

## In-world body policy

The shipped `lizzie.glb` / `remington_borden.glb` files are meshopt **stubs** (~5 KB), not walkable humans. The character menu uses the preview PNGs; `usePrimitiveBody` forces the procedural `Character` mesh in-world until real human GLBs ship.
