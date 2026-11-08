/**
 * §9.1.1 Surface footsteps — map surface → sample key.
 */

import type { Surface } from "./ClockWeather";

export type FootstepKey = "asphalt" | "grass" | "wood" | "water" | "dirt" | "cobble" | "sand";

const MAP: Record<Surface, FootstepKey> = {
  asphalt: "asphalt",
  wetAsphalt: "asphalt",
  cobble: "cobble",
  dirt: "dirt",
  grass: "grass",
  sand: "sand",
  planks: "wood",
  water: "water",
};

export function footstepFor(surface: Surface): FootstepKey {
  return MAP[surface] ?? "asphalt";
}

/** Cadence interval seconds from speed. */
export function footstepInterval(speed: number): number {
  const s = Math.max(0.5, Math.abs(speed));
  return Math.max(0.28, Math.min(0.7, 1.1 / s));
}

export const FOOTSTEP_SURFACES: FootstepKey[] = [
  "asphalt", "grass", "wood", "water", "dirt", "cobble", "sand",
];
