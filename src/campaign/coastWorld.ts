// The street build and the tiles build share one campaign (src/earth/jobs.ts).
// On the street map the world origin is the New Bedford slice, so a job pin
// is just that lat/lon turned into the same meters the player already uses.

import { SLICE_ORIGIN, latLonToLocal } from "../earth/geo";

export function coastTarget(lat: number, lon: number): { x: number; z: number } {
  return latLonToLocal(SLICE_ORIGIN, { lat, lon });
}

export function reachedPin(
  px: number,
  pz: number,
  pin: { x: number; z: number },
  radius: number,
): boolean {
  return Math.hypot(px - pin.x, pz - pin.z) <= radius;
}
