/**
 * §3.1.2 / §3.1.4 Witness LOS gating via SpatialIndex.segment.
 */

import { SpatialIndex } from "./SpatialIndex";

export interface WitnessActor {
  id: string;
  x: number;
  z: number;
  kind: "ped" | "cop";
}

/**
 * Returns witnesses that have clear corridor LOS to the player
 * (no other actor within halfWidth of the segment counts as occlusion for stub).
 */
export function witnessesWithLos(
  index: SpatialIndex<WitnessActor>,
  player: { x: number; z: number },
  radius: number,
  halfWidth = 1.2,
): WitnessActor[] {
  const nearby = index.queryRadius(player.x, player.z, radius, (a) => ({ x: a.x, z: a.z }));
  const hits: WitnessActor[] = [];
  for (const w of nearby) {
    if (w.id === "player") continue;
    const blockers = index.querySegment(w.x, w.z, player.x, player.z, halfWidth, (a) => ({
      x: a.x,
      z: a.z,
    }));
    // Occluded if another actor sits on the segment (excluding endpoints).
    const occluded = blockers.some(
      (b) => b.id !== w.id && Math.hypot(b.x - player.x, b.z - player.z) > 0.5,
    );
    if (!occluded) hits.push(w);
  }
  return hits;
}

export function applyWitnessHeat(
  witnesses: WitnessActor[],
  heat: { witness: (o: { pedLos?: boolean; copLos?: boolean }) => void },
): void {
  let ped = false;
  let cop = false;
  for (const w of witnesses) {
    if (w.kind === "cop") cop = true;
    else ped = true;
  }
  if (ped || cop) heat.witness({ pedLos: ped, copLos: cop });
}
