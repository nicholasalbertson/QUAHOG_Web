# Compression budget per asset class (§0.5)

| Class | Target (gzipped / encoded) | Notes |
|-------|----------------------------|-------|
| Audio SFX (one-shot) | ≤ 80 KB | Prefer OGG; mono where possible |
| Audio music bed | ≤ 1.5 MB / track | Streamed; deferred load |
| Texture albedo (prop) | ≤ 256 KB | ASTC/Basis when pipeline exists; PNG fallback |
| Texture albedo (hero) | ≤ 512 KB | |
| Mesh (prop GLB) | ≤ 200 KB | meshopt + draco preferred |
| Mesh (vehicle/actor) | ≤ 800 KB | |
| Slice JSON | ≤ 4 MB | Already streamed by city |

`npm run assets:audit` remains the license gate; size budgets are soft until CI enforces.
