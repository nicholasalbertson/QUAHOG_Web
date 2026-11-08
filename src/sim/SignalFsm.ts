/**
 * §13.1 Traffic signal FSM — red → green → yellow → red.
 * Drives PedGraph crosswalk walk windows.
 */

export type SignalPhase = "red" | "green" | "yellow";

export interface SignalState {
  id: string;
  phase: SignalPhase;
  t: number;
  /** Offset so nearby signals desync. */
  phaseOffset: number;
}

const DUR: Record<SignalPhase, number> = {
  green: 8,
  yellow: 2.5,
  red: 7,
};

export function createSignal(id: string, offset = 0): SignalState {
  return { id, phase: "red", t: 0, phaseOffset: offset };
}

export function stepSignal(s: SignalState, dt: number): SignalPhase {
  s.t += dt;
  const lim = DUR[s.phase];
  if (s.t >= lim) {
    s.t = 0;
    s.phase = s.phase === "green" ? "yellow" : s.phase === "yellow" ? "red" : "green";
  }
  return s.phase;
}

/** Ped walk window — green for vehicle means don't walk; red means walk. */
export function pedWalkAllowed(s: SignalState): boolean {
  return s.phase === "red" && s.t > 0.4 && s.t < DUR.red - 0.5;
}

export class SignalNetwork {
  private signals = new Map<string, SignalState>();

  add(id: string, offset = 0): SignalState {
    const s = createSignal(id, offset);
    this.signals.set(id, s);
    return s;
  }

  stepAll(dt: number): void {
    for (const s of this.signals.values()) stepSignal(s, dt);
  }

  get(id: string): SignalState | undefined {
    return this.signals.get(id);
  }

  /** Nearest signal walk window for a ped at (x,z). */
  walkNear(
    x: number,
    z: number,
    positions: { id: string; x: number; z: number }[],
    maxDist = 18,
  ): boolean {
    let best: SignalState | null = null;
    let bestD = maxDist * maxDist;
    for (const p of positions) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d > bestD) continue;
      const s = this.signals.get(p.id);
      if (!s) continue;
      best = s;
      bestD = d;
    }
    return best ? pedWalkAllowed(best) : true;
  }
}
