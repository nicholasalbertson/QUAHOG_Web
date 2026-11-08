/**
 * §1.3.35 / §8.2 Cutscene hand-off stub + §1.3.36 / §9.4 audio duck hook.
 */

import { spatialAudio } from "../audio/SpatialAudio";

type DuckFn = (level: number) => void;

let duck: DuckFn = (level) => spatialAudio.setDuck(level);
let active = false;

export function setCutsceneDuck(fn: DuckFn): void {
  duck = fn;
}

export function beginCutscene(): void {
  active = true;
  duck(0.35);
}

export function endCutscene(): void {
  active = false;
  duck(1);
}

export function isCutsceneActive(): boolean {
  return active;
}

/** Chase/wanted ducking helper used by GameSystems radio path. */
export function duckForWanted(stars: number): number {
  if (active) return 0.35;
  if (stars >= 3) return 0.4;
  return 1;
}
