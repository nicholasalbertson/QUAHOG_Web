/**
 * §5.4 Race stub — multi-track defs + rubber-band AI + bests.
 */

import { rng } from "./Rng";

export interface RaceTrack {
  id: string;
  name: string;
  /** Checkpoint XZ. */
  checkpoints: { x: number; z: number }[];
  classLock?: "car" | "boat" | "any";
  failSec: number;
}

export const RACE_TRACKS: RaceTrack[] = [
  {
    id: "harbor-loop",
    name: "Harbor Loop",
    checkpoints: [
      { x: -280, z: 100 },
      { x: -200, z: 160 },
      { x: -240, z: 40 },
    ],
    classLock: "car",
    failSec: 180,
  },
  {
    id: "rt6-dash",
    name: "Route 6 Dash",
    checkpoints: [
      { x: -3900, z: 400 },
      { x: -3500, z: 380 },
      { x: -3200, z: 420 },
    ],
    classLock: "car",
    failSec: 210,
  },
  {
    id: "island-wake",
    name: "Island Wake",
    checkpoints: [
      { x: 6100, z: 4500 },
      { x: 6200, z: 4600 },
      { x: 6150, z: 4400 },
    ],
    classLock: "boat",
    failSec: 240,
  },
];

export interface RaceOpponent {
  id: string;
  progress: number;
  skill: number;
}

export interface RaceState {
  trackId: string;
  elapsed: number;
  playerProgress: number;
  opponents: RaceOpponent[];
  finished: boolean;
  dnf: boolean;
  best?: number;
}

export function startRace(trackId: string, opponentCount = 3): RaceState | null {
  const track = RACE_TRACKS.find((t) => t.id === trackId);
  if (!track) return null;
  const r = rng.stream("traffic");
  const opponents: RaceOpponent[] = [];
  for (let i = 0; i < opponentCount; i++) {
    opponents.push({
      id: `ai-${i}`,
      progress: 0,
      skill: 0.7 + r.next() * 0.35,
    });
  }
  return {
    trackId,
    elapsed: 0,
    playerProgress: 0,
    opponents,
    finished: false,
    dnf: false,
  };
}

/** Rubber-band: slow leaders, boost trailers toward player. */
export function stepRace(state: RaceState, dt: number, playerDelta: number, failSec: number): RaceState {
  if (state.finished || state.dnf) return state;
  state.elapsed += dt;
  state.playerProgress = Math.min(1, state.playerProgress + playerDelta);
  for (const o of state.opponents) {
    let rate = 0.08 * o.skill * dt;
    const lead = o.progress - state.playerProgress;
    if (lead > 0.12) rate *= 0.7; // rubber-band down
    if (lead < -0.12) rate *= 1.25; // catch-up
    o.progress = Math.min(1, o.progress + rate);
  }
  if (state.playerProgress >= 1) {
    state.finished = true;
    state.best = state.elapsed;
  } else if (state.elapsed >= failSec) {
    state.dnf = true;
  }
  return state;
}

export function racePosition(state: RaceState): number {
  const scores = [state.playerProgress, ...state.opponents.map((o) => o.progress)];
  const mine = state.playerProgress;
  return 1 + scores.filter((s) => s > mine + 1e-6).length;
}
