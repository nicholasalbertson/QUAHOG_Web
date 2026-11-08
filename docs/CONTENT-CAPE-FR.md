# Cape / Fall River / Brockton content status (§7.3)

**Status (2026-11-08):** Slices + streamed tiles are **landed** for FR, Brockton, and Cape. Corridor drive between districts is live. Remaining blockers are **authored Tier-1 packs / verified heights**, not empty void.

## Landed in tree

| District | Roads / slice | Streamed tiles | Fronts / landmarks | Height provenance |
|----------|---------------|----------------|--------------------|-------------------|
| Fall River | `slice-fallriver.json` | yes (shared `tiles/`) | 3 FR fronts + heroes | FR Tier-1 lidar where baked; others estimated |
| Brockton | `slice-brockton.json` | yes (~Cappiello `b_-17_99`) | gym / downtown landmarks | **3DEP gap** — all estimated 8.0 m (see below) |
| Cape / Hyannis | `slice-cape.json` | yes | marina / compound anchors | mostly estimated defaults |

Also ready: `WorldManifest` zones, multi-district streamer, Act II/III mission anchors, Fall River + Long Island / Dartmouth businesses.

## Brockton height blocker (§7.3 Tier-1)

USGS 3DEP has a **data hole** over Brockton: **983 buildings / 10 target cells** are `gap` with **0 class-6 points**. Lidar run completion will **not** fix Brockton — heights stay estimated until an alt source + on-site photos. Details: [BROCKTON-HEIGHT-GAP.md](./BROCKTON-HEIGHT-GAP.md), [HEIGHT-SOURCES.md](./HEIGHT-SOURCES.md).

## Still open (authored)

1. Brockton / Cape Tier-1 facade packs (photos + alt heights)
2. FR remaining hero verification beyond landed lidar set
3. Collectible / dressing density per district polish

## Unblock plan

1. **Do not wait on Brockton 3DEP** — treat lidar finish as NB/FR only.
2. Rebake Brockton downtown heights from OSM `levels×3m` (expansion pipeline) and tag `heightSource`.
3. Photo-match the 10 Brockton Tier-1 targets; keep `ESTIMATED` until verified.
4. Keep corridor + missions playable on estimated extrusions.
