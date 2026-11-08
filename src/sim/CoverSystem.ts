/**
 * §5.2.7 Cover system (scope gate) — logic stub.
 */

export type CoverSide = "left" | "right" | "low";

export interface CoverSpot {
  id: string;
  x: number;
  z: number;
  yaw: number;
  side: CoverSide;
}

export interface CoverState {
  inCover: boolean;
  spot: CoverSpot | null;
  lean: number; // -1..1
}

export function createCoverState(): CoverState {
  return { inCover: false, spot: null, lean: 0 };
}

export function nearestCover(
  spots: CoverSpot[],
  x: number,
  z: number,
  maxDist = 2.5,
): CoverSpot | null {
  let best: CoverSpot | null = null;
  let bestD = maxDist;
  for (const s of spots) {
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function enterCover(state: CoverState, spot: CoverSpot): void {
  state.inCover = true;
  state.spot = spot;
  state.lean = 0;
}

export function exitCover(state: CoverState): void {
  state.inCover = false;
  state.spot = null;
  state.lean = 0;
}

export function setLean(state: CoverState, lean: number): void {
  if (!state.inCover) return;
  state.lean = Math.max(-1, Math.min(1, lean));
}
