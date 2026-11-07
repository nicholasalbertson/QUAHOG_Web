/**
 * §5.5 Traffic signal FSM stub — independent Mount Hope design.
 * States cycle green → yellow → red with configurable dwells.
 */

export type SignalPhase = "green" | "yellow" | "red";

export interface SignalTiming {
  greenSec: number;
  yellowSec: number;
  redSec: number;
}

export interface SignalConfig extends Partial<SignalTiming> {
  /** Offset so adjacent signals are not in sync. */
  phaseOffsetSec?: number;
}

export class SignalFsm {
  readonly greenSec: number;
  readonly yellowSec: number;
  readonly redSec: number;
  private t: number;
  private phase: SignalPhase = "green";

  constructor(cfg: SignalConfig = {}) {
    this.greenSec = cfg.greenSec ?? 12;
    this.yellowSec = cfg.yellowSec ?? 3;
    this.redSec = cfg.redSec ?? 14;
    this.t = cfg.phaseOffsetSec ?? 0;
    this.advance(0);
  }

  get state(): SignalPhase {
    return this.phase;
  }

  get timing(): SignalTiming {
    return { greenSec: this.greenSec, yellowSec: this.yellowSec, redSec: this.redSec };
  }

  /** Advance by dt seconds; returns current phase. */
  advance(dt: number): SignalPhase {
    this.t += dt;
    const cycle = this.greenSec + this.yellowSec + this.redSec;
    let u = ((this.t % cycle) + cycle) % cycle;
    if (u < this.greenSec) this.phase = "green";
    else if (u < this.greenSec + this.yellowSec) this.phase = "yellow";
    else this.phase = "red";
    return this.phase;
  }

  /** True when vehicles on this approach should stop / yield. */
  shouldStop(): boolean {
    return this.phase === "red" || this.phase === "yellow";
  }
}

/** Build a bank of N signals with staggered phase offsets. */
export function makeSignalBank(count: number, timing: Partial<SignalTiming> = {}): SignalFsm[] {
  const n = Math.max(0, count | 0);
  const cycle = (timing.greenSec ?? 12) + (timing.yellowSec ?? 3) + (timing.redSec ?? 14);
  const out: SignalFsm[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      new SignalFsm({
        ...timing,
        phaseOffsetSec: (cycle / Math.max(1, n)) * i,
      }),
    );
  }
  return out;
}
