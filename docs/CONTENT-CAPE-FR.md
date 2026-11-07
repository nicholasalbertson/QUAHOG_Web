# Cape / Fall River / Brockton content status (§7.2–§7.3)

**Status (2026-11-07):** Playable via fast-travel. Slices, tile rings, districts,
missions, heroes, fronts, and collectibles are wired. No continuous drivable
corridor between districts (by design — remount on district switch).

## Shipped

| District | Slice | Tile ring | Fast travel | Heroes | Fronts | Scrimshaw |
|----------|-------|-----------|-------------|--------|--------|-----------|
| New Bedford | `slice-newbedford.json` | yes | 9 | Dartmouth Mall | 7 | 8 |
| Fall River | `slice-fallriver.json` | yes (~85 keys) | 3 | USS Massachusetts, Lizzie Borden + Tier1 packs | 3 | 3 |
| Brockton | `slice-brockton.json` | yes (~187 keys) | 1 | Cappiello Boxing Gym | 2 | 2 |
| Cape / Hyannis | `slice-cape.json` | yes (~159 keys) | 2 | Hyannis Marina, Kennedy Compound | 2 | 2 |

## Code wiring

- `src/districts.ts` — four-district registry + `districtOfWorld`
- `Experience` remounts on `key={district}`; loads `district.sliceFile`
- Missions Act II/III target real Cappiello / Hyannis Marina / Kennedy Compound
- `prepareRoads` — FR service exemptions + Cape marina slip/dock exemptions
- `WorldManifest` — district zone + fronts/collectibles from active district
- Big map fast-travel switches district then teleports

## Still open (not blocking travel)

1. Authored corridor / continuous drive NB ↔ FR ↔ Brockton ↔ Cape (scope gate)
2. Lived-in dressing density (props/peds) when `DRESSING_ENABLED` is on
3. Cape/Brockton Tier-1 GLB packs (procedural heroes stand in for now)
4. Measured FPS soak in each expansion district (`docs/FPS-MATRIX.md`)

## Unblock for continuous drive (future)

1. Bake overlapping tile rings along I-195 / Rt 24 / Rt 6 corridors
2. Single multi-district streamer without Experience remount
3. Revisit Act II/III mission pacing once corridors exist
