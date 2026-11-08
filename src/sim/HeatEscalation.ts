/**
 * §3.2.7–3.2.8 Escalation / de-escalation reasons → HeatAxes deltas.
 */

import { HeatAxes } from "./HeatAxes";

export type EscalateReason =
  | "witness_count"
  | "officer_down"
  | "repeat_crime"
  | "backup_call";

export type DeescalateReason =
  | "bribe"
  | "lose_heat_zone"
  | "safehouse"
  | "time";

const ESCALATE: Record<EscalateReason, { suspicion: number; wanted: number }> = {
  witness_count: { suspicion: 0.35, wanted: 0.55 },
  officer_down: { suspicion: 0.8, wanted: 1.6 },
  repeat_crime: { suspicion: 0.25, wanted: 0.45 },
  backup_call: { suspicion: 0.2, wanted: 0.7 },
};

const DEESCALATE: Record<DeescalateReason, { suspicion: number; wanted: number }> = {
  bribe: { suspicion: 1.2, wanted: 1.5 },
  lose_heat_zone: { suspicion: 0.4, wanted: 0.55 },
  safehouse: { suspicion: 5, wanted: 5 },
  time: { suspicion: 0.15, wanted: 0.12 },
};

export function escalateHeat(heat: HeatAxes, reason: EscalateReason): void {
  const d = ESCALATE[reason];
  heat.suspicion = Math.min(5, heat.suspicion + d.suspicion);
  heat.wanted = Math.min(5, heat.wanted + d.wanted);
}

export function deescalateHeat(heat: HeatAxes, reason: DeescalateReason): void {
  const d = DEESCALATE[reason];
  heat.suspicion = Math.max(0, heat.suspicion - d.suspicion);
  heat.wanted = Math.max(0, heat.wanted - d.wanted);
}
