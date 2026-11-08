/**
 * §5.4.6 Race HUD (position, lap, splits).
 */

import { RACE_TRACKS, racePosition, type RaceState } from "./RaceStub";

export interface RaceHudModel {
  position: number;
  field: number;
  /** Progress 0..1 mapped to checkpoint index for multi-checkpoint tracks. */
  checkpoint: number;
  checkpoints: number;
  elapsedSec: number;
  bestSec: number | null;
  finished: boolean;
  dnf: boolean;
}

export function raceHudModel(race: RaceState): RaceHudModel {
  const track = RACE_TRACKS.find((t) => t.id === race.trackId);
  const cps = track?.checkpoints.length ?? 1;
  const checkpoint = Math.min(cps, Math.floor(race.playerProgress * cps) + 1);
  return {
    position: racePosition(race),
    field: 1 + race.opponents.length,
    checkpoint,
    checkpoints: cps,
    elapsedSec: race.elapsed,
    bestSec: race.best ?? null,
    finished: race.finished,
    dnf: race.dnf,
  };
}
