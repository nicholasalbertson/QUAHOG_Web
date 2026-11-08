# Building height sources

How extrusion heights are sourced, tagged, and what each label means.

| Tag / source | Meaning | Districts |
|--------------|---------|-----------|
| `lidar` | USGS 3DEP class-6 / measured roof | Fall River Tier-1 heroes (where landed) |
| `measured` / `nic:…` | Documented field measurement | e.g. Seamen's Bethel |
| `osm:levels_x3m_estimate` | OSM `building:levels` × ~3 m | NB GIS rows (Star Store, Visitor Center) |
| `estimated-from-blockout` / `fallback-default` | Bake default | GIS legacy rows |
| `3dep-gap-estimated-default` | **Brockton 3DEP hole** — flat 8.0 m until alt source | Brockton streamed tiles (runtime tag) |
| `ESTIMATED` (Tier-1 flag text) | Hero GLB height not lidar-verified | NB downtown Tier-1 |

## Brockton (blocked)

See [BROCKTON-HEIGHT-GAP.md](./BROCKTON-HEIGHT-GAP.md). USGS 3DEP has **0 class-6 points** over the 10 Tier-1 Brockton cells (983 buildings = `gap`). Finishing the corridor lidar job does **not** raise Brockton heights.

**Alt sources (in priority order):**

1. OSM `building:levels` × 3 m rebake (expansion pipeline)
2. MassGIS / municipal structure heights if available
3. On-site photos (story count + ridge) for the 10 target packs

## Runtime

`StreamingBuildings` tags Brockton tile loads with `heightSource: "3dep-gap-estimated-default"` when absent, so tools never treat those rows as “pending lidar.” Extrusion still uses `b.height` only.
