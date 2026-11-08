# Brockton height gap (USGS 3DEP hole)

**Finding (2026-11-07):** USGS 3DEP has a data hole over Brockton. All **983
buildings** in the **10 Tier-1 target cells** are labeled `gap` with **0
class-6 points**. Finishing the corridor lidar run will **not** fix Brockton
heights — they remain `estimated`.

## What this blocks

- §7.3 Tier-1 packs for Brockton (authored heights / verified facades)
- Any "lidar-verified" checklist flip for Brockton cells

## Unblock path (external)

1. **Alternative height source** — MassGIS building heights, OSM `building:levels`
   × ~3 m, or municipal GIS — applied as explicit `estimated` with provenance.
2. **On-site photos** — facade stories + ridge for the 10 target packs.
3. Keep NB/FR lidar results for those districts; do not wait on Brockton 3DEP.

## Code stance

- Estimated heights remain valid to ship (scrimshaw / fronts / missions).
- Manifest flags should say `ESTIMATED` / `gap` / provenance — never silent.
- Lidar progress counters elsewhere do not imply Brockton verification.
