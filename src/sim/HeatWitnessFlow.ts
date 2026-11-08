/**
 * §3.1.7 Shooting witness raises wanted; hiding lowers predictably.
 */

import { HeatAxes } from "./HeatAxes";
import { applyWitnessHeat, witnessesWithLos, type WitnessActor } from "./WitnessLos";
import { SpatialIndex } from "./SpatialIndex";

export function shootWithWitnesses(
  heat: HeatAxes,
  index: SpatialIndex<WitnessActor>,
  player: { x: number; z: number },
  radius = 40,
): { witnesses: number; wantedBefore: number; wantedAfter: number } {
  const before = heat.wanted;
  const hits = witnessesWithLos(index, player, radius);
  applyWitnessHeat(hits, heat);
  heat.commit("shots", hits.some((w) => w.kind === "cop" || w.kind === "ped"));
  return { witnesses: hits.length, wantedBefore: before, wantedAfter: heat.wanted };
}

export function hideDecay(heat: HeatAxes, seconds: number, loseHeatZone = false): number {
  const step = 1 / 30;
  for (let t = 0; t < seconds; t += step) {
    heat.decay(step, true, loseHeatZone);
  }
  return heat.wanted;
}
