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

/** §9.1.6 Impact SFX key per friction surface. */
export type ImpactKey = "asphalt" | "dirt" | "metal" | "wood" | "water" | "flesh";

const IMPACT: Record<Surface, ImpactKey> = {
  asphalt: "asphalt",
  wetAsphalt: "asphalt",
  cobble: "asphalt",
  dirt: "dirt",
  grass: "dirt",
  sand: "dirt",
  planks: "wood",
  water: "water",
};

export function impactFor(surface: Surface): ImpactKey {
  return IMPACT[surface] ?? "asphalt";
}

/** Assert every Surface has both footstep + impact coverage. */
export function surfaceSfxHoles(surfaces: Surface[]): string[] {
  const holes: string[] = [];
  for (const s of surfaces) {
    if (!MAP[s]) holes.push(`footstep:${s}`);
    if (!IMPACT[s]) holes.push(`impact:${s}`);
  }
  return holes;
}

/** Cadence interval seconds from speed. */
export function footstepInterval(speed: number): number {
  const s = Math.max(0.5, Math.abs(speed));
  return Math.max(0.28, Math.min(0.7, 1.1 / s));
}

export const FOOTSTEP_SURFACES: FootstepKey[] = [
  "asphalt", "grass", "wood", "water", "dirt", "cobble", "sand",
];
