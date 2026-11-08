# Earth vehicle licenses (§2.6.1)

Recorded 2026-11-07. This is a license *record*, not a license *grant* —
it states what the earth build actually uses and where each asset came from.

## What earth uses

| Asset | Pack | Source | License |
|-------|------|--------|---------|
| Player car (`sports_coupe.glb`) | pack006 | In-house Blender-authored (Blender 5.2.3 LTS, 52 templates) | **NOT CC0** — in-house, "staging only" per `public/packs/pack006/manifest.json` |
| NPC cars (`sports_coupe`, `mid_sedan`, `offroad_suv`) | pack006 | Same as above | **NOT CC0** — same in-house pack |

## The CC0 gap (§2.6.1 NOT fully satisfied)

The checklist asks for a **CC0 GLB set** with a license file committed.
That set has **not** been sourced:

- Every pack in `public/packs/` (pack001–pack012) is in-house
  Blender-authored, marked "staging only" in its manifest, with **no
  license field and no CC0 claim**. Do not claim CC0 for any of them.
- No external CC0 vehicle set (e.g. Kenney Car Kit) has been downloaded
  or wired in. Sourcing one is a future step — it changes the vehicle
  visuals, so it needs Nic's call, and it must be verified as CC0
  (license file in the download) before any file lands in the tree.
- The game's distribution stance (Nic, 2026-11-02: "I'm not trying to
  sell this game" — not distributing it) means the in-house pack is the
  current basis. That stance does not make the pack CC0.

## Shared with stylized (§2.6.4)

- `TrafficPackCar`, `carProfile` (`src/earth/heroVehicleGeometry.ts`),
  and `VEHICLE_TYPES` (`src/earth/vehicleTypes.ts`) are already shared
  between the stylized and earth builds — both render pack GLBs through
  the same components.
- Headlights (`CarHeadlights`, `headlightNightFactor`) are NOT yet shared:
  earth has no night signal, so there is nothing to gate the beams on.
  Blocked on §2.9.1 (day/night ↔ weather coupling); once the shared sim
  (§2.8) provides `dayT`, the earth player car mounts the same
  `CarHeadlights` the stylized car uses.

## Import pipeline (§2.6.2)

- `PackGLB` (`src/actors/PackGLB.tsx`) is the import pipeline: loads a
  pack GLB, clones it, disposes geometries/materials/textures on unmount.
- **LODs and material remap are NOT done.** Pack models are ~124–172
  triangles each (pack006 manifest), so LODs are a polish item, not a
  load blocker — but the checklist item is not satisfied by the pipeline
  alone.
