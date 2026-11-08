/**
 * Building height provenance tags — especially Brockton's USGS 3DEP gap.
 * Extrusion still uses `Building.height`; these tags stop tools treating
 * gap/estimated rows as "pending lidar."
 */
import type { Building } from "../slice";
import { districtOfWorld } from "../districts";

/** Runtime tag for Brockton tiles sitting in the 3DEP hole (flat defaults). */
export const BROCKTON_HEIGHT_SOURCE = "3dep-gap-estimated-default";

/** World sample at the center of a streamed tile key (`gx_gn`, size meters). */
export function tileKeyWorldSample(key: string, tileSize = 500): { x: number; z: number } {
  const [gx, gn] = key.split("_").map(Number);
  const east = (gx + 0.5) * tileSize;
  const north = (gn + 0.5) * tileSize;
  return { x: east, z: -north };
}

export function isBrocktonTileKey(key: string, tileSize = 500): boolean {
  const { x, z } = tileKeyWorldSample(key, tileSize);
  return districtOfWorld(x, z) === "brockton";
}

/** Stamp missing heightSource; leave existing lidar/measured tags alone. */
export function tagEstimatedHeights(buildings: Building[], source: string): Building[] {
  let changed = false;
  const out = buildings.map((b) => {
    if (b.heightSource) return b;
    changed = true;
    return { ...b, heightSource: source };
  });
  return changed ? out : buildings;
}

export function tagBrocktonTileBuildings(key: string, buildings: Building[], tileSize = 500): Building[] {
  if (!isBrocktonTileKey(key, tileSize)) return buildings;
  return tagEstimatedHeights(buildings, BROCKTON_HEIGHT_SOURCE);
}
