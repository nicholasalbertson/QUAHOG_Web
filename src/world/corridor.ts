// Corridor phase 1 (2026-11-07, Nic's order — the scope gate).
// The authored continuous-drive corridors NB <-> FR (I-195), FR <-> Brockton
// (MA 24), NB <-> Cape (US 6) reverse the fast-travel-only standard: the
// districts are connected by drivable road + tile strips, and a single
// multi-district streamer loads them without remounting Experience.
//
// This module is the pure, testable core: the corridor slice file, the
// region-wide ground bounds, and the fast-travel spawn-safety predicate.
// It imports nothing from the game (no React, no store) so the corridor
// test can assert the safety contract directly.
//
// Ground bounds (world coords [x, z]):
//   The old ground plane spanned +-30,000 in both axes. The expansion
//   districts sit OUTSIDE it — Brockton spawn z=-49,681, Hyannis Marina
//   x=53,850, Kennedy Compound x=51,425 — which is exactly why Nic's
//   2026-11-07 playtest fell through the ground after fast-travelling
//   there: the player spawned with no ground collider (and no visual
//   ground) under him. The new bounds are the old box UNION the district
//   bounds UNION the corridor strips, so the enlarged ground never
//   shrinks any direction vs the old plane:
//     x: old -30,000 .. Cape bound 57,116.5 + 500 margin = 57,617
//     z: Brockton bound -52,765.7 - 500 margin = -53,266 .. old +30,000
//   Center [13,808.5, -11,633], size 87,617 x 83,266.
//   The corridor strips add nothing beyond these extremes (the routes run
//   between the district centers, inside the union).
//   Ground.tsx renders the plane + collider from these bounds.

export const CORRIDOR_SLICE_FILE = "slice-corridor.json";

export interface RegionBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

/** Region-wide ground bounds (world [x, z]). See the header derivation. */
export const REGION_BOUNDS: RegionBounds = {
  xMin: -30000,
  xMax: 57617,
  zMin: -53266,
  zMax: 30000,
};

/** Center of REGION_BOUNDS (world [x, z]) — the Ground plane position. */
export const REGION_CENTER: [number, number] = [
  (REGION_BOUNDS.xMin + REGION_BOUNDS.xMax) / 2,
  (REGION_BOUNDS.zMin + REGION_BOUNDS.zMax) / 2,
];

/** Size of REGION_BOUNDS (world [x, z]) — the Ground plane dimensions. */
export const REGION_SIZE: [number, number] = [
  REGION_BOUNDS.xMax - REGION_BOUNDS.xMin,
  REGION_BOUNDS.zMax - REGION_BOUNDS.zMin,
];

/**
 * Fast-travel spawn-safety predicate: true when the world point has ground
 * under it (inside the region-wide ground plane). A fast-travel target
 * must satisfy this before the player is teleported there — spawning
 * outside the bounds is the Nov 7 fall-through bug, reproduced exactly.
 */
export function groundCovers(x: number, z: number): boolean {
  return (
    x >= REGION_BOUNDS.xMin &&
    x <= REGION_BOUNDS.xMax &&
    z >= REGION_BOUNDS.zMin &&
    z <= REGION_BOUNDS.zMax
  );
}
