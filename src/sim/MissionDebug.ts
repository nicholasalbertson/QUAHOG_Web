/**
 * §1.3.40 Mission debug panel model — active mission, owned counts, triggers.
 */

import type { MissionRuntime } from "./MissionRuntime";
import type { Trigger } from "./Triggers";

export interface MissionDebugRow {
  phase: string;
  mi: number;
  step: number;
  failReason: string | null;
  owned: number;
  triggers: { id: string; kind: string; armed: boolean; fired: boolean }[];
  objective: string;
  elapsed: number;
  stepElapsed: number;
}

export function missionDebugSnapshot(
  rt: MissionRuntime,
  triggers: Trigger[] = [],
): MissionDebugRow {
  return {
    phase: rt.phase,
    mi: rt.mi,
    step: rt.step,
    failReason: rt.failReason,
    owned: rt.ownedCount,
    triggers: triggers.map((t) => ({
      id: t.id,
      kind: t.kind,
      armed: t.armed !== false,
      fired: !!t.fired,
    })),
    objective: rt.objectiveState,
    elapsed: rt.elapsed,
    stepElapsed: rt.stepElapsed,
  };
}
