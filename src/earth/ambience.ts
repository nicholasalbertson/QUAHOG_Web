// Which procedural bed the coast should use. No audio files: the synth
// retunes the wind and wave filters that are already running.

import type { RegionId } from "./regions";

export type BedName = "harbor" | "mill" | "city" | "highway" | "cape";

export function bedFor(region: RegionId, speed: number, onHighway: boolean): BedName {
  if (onHighway || speed > 18) return "highway";
  if (region === "fallRiver") return "mill";
  if (region === "newBedford") return "harbor";
  if (region === "cape") return "cape";
  if (region === "brockton") return "city";
  return "harbor";
}
