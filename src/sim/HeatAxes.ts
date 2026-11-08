/**
 * §3.1 Dual-axis heat — suspicion (unseen) vs wanted (seen).
 * Independent Mount Hope design.
 */

import { emitTelemetry } from "../telemetry/schema";

export type CrimeKind =
  | "assault"
  | "shots"
  | "hitRun"
  | "kill"
  | "theft"
  | "speeding";

/** §3.1.3 Crime table → suspicion / wanted deltas. */
export const CRIME_TABLE: Record<CrimeKind, { suspicion: number; wanted: number; cooldown: number }> = {
  assault: { suspicion: 0.4, wanted: 0.6, cooldown: 2 },
  shots: { suspicion: 0.5, wanted: 0.9, cooldown: 1.5 },
  hitRun: { suspicion: 0.3, wanted: 0.8, cooldown: 3 },
  kill: { suspicion: 0.8, wanted: 1.5, cooldown: 4 },
  theft: { suspicion: 0.35, wanted: 0.5, cooldown: 2 },
  speeding: { suspicion: 0.15, wanted: 0.2, cooldown: 5 },
};

export interface HeatAxesState {
  suspicion: number;
  wanted: number;
}

export class HeatAxes {
  suspicion = 0;
  wanted = 0;
  private cooldowns = new Map<CrimeKind, number>();

  /** §3.1.2 Witness: ped LOS raises suspicion; cop LOS raises wanted. */
  witness(opts: { pedLos?: boolean; copLos?: boolean; amount?: number }): void {
    const a = opts.amount ?? 0.15;
    if (opts.pedLos) this.suspicion = Math.min(5, this.suspicion + a);
    if (opts.copLos) this.wanted = Math.min(5, this.wanted + a * 1.4);
  }

  /** Apply crime with per-kind cooldown (§3.1.5). */
  commit(kind: CrimeKind, seen: boolean): boolean {
    const cd = this.cooldowns.get(kind) ?? 0;
    if (cd > 0) return false;
    const row = CRIME_TABLE[kind];
    this.cooldowns.set(kind, row.cooldown);
    this.suspicion = Math.min(5, this.suspicion + row.suspicion);
    if (seen) this.wanted = Math.min(5, this.wanted + row.wanted);
    emitTelemetry("sim.heat.crime", { kind, seen, suspicion: this.suspicion, wanted: this.wanted });
    return true;
  }

  /**
   * §3.1.1 / §3.1.6 Decay when unseen + outside lose-heat zone.
   * @param loseHeatZone when true, decay faster.
   */
  decay(dt: number, unseen: boolean, loseHeatZone = false): void {
    for (const [k, v] of this.cooldowns) {
      const n = v - dt;
      if (n <= 0) this.cooldowns.delete(k);
      else this.cooldowns.set(k, n);
    }
    if (!unseen) return;
    const rate = loseHeatZone ? 0.35 : 0.12;
    this.suspicion = Math.max(0, this.suspicion - rate * dt);
    this.wanted = Math.max(0, this.wanted - rate * 0.7 * dt);
  }

  /** Stars for HUD / HeatTiers — max of both axes. */
  stars(): number {
    return Math.max(0, Math.min(5, Math.floor(Math.max(this.suspicion, this.wanted))));
  }

  serialize(): HeatAxesState {
    return { suspicion: this.suspicion, wanted: this.wanted };
  }

  restore(s: HeatAxesState): void {
    this.suspicion = s.suspicion;
    this.wanted = s.wanted;
  }
}
