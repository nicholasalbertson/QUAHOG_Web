/**
 * §1.1.24 / §0.2 — lightweight sim debug snapshot for HUD / telemetry overlay.
 */

import type { FlagDefs } from "../flags";
import { getFlags } from "../flags";
import type { LoopStats } from "./GameLoop";

export interface DebugOverlayState {
  loop: LoopStats;
  flags: FlagDefs;
  pedNodes: number;
  pedEdges: number;
  pedOrphans: number;
  roadNodes: number;
  replay: string;
  stepDigest: string;
  /** §1.2.24 / §1.3.40 occupancy + mission debug bits. */
  occupancyHot?: number;
  missionOwned?: number;
  triggersArmed?: number;
  /** §1.8.8 Spatial cell occupancy summary. */
  spatialCells?: number;
  spatialItems?: number;
  /** §1.3.19 Trigger debug — fired count. */
  triggersFired?: number;
  /** §1.11.4 Top FrameBudget overrun systems. */
  budgetOverruns?: string;
  /** §2.1.6 WebGL context phase. */
  glContext?: string;
}

let last: DebugOverlayState | null = null;

export function publishDebugOverlay(partial: Partial<DebugOverlayState> & { loop: LoopStats }): void {
  last = {
    loop: partial.loop,
    flags: partial.flags ?? ({ ...getFlags() } as FlagDefs),
    pedNodes: partial.pedNodes ?? last?.pedNodes ?? 0,
    pedEdges: partial.pedEdges ?? last?.pedEdges ?? 0,
    pedOrphans: partial.pedOrphans ?? last?.pedOrphans ?? 0,
    roadNodes: partial.roadNodes ?? last?.roadNodes ?? 0,
    replay: partial.replay ?? last?.replay ?? "",
    stepDigest: partial.stepDigest ?? last?.stepDigest ?? "",
    occupancyHot: partial.occupancyHot ?? last?.occupancyHot ?? 0,
    missionOwned: partial.missionOwned ?? last?.missionOwned ?? 0,
    triggersArmed: partial.triggersArmed ?? last?.triggersArmed ?? 0,
    spatialCells: partial.spatialCells ?? last?.spatialCells ?? 0,
    spatialItems: partial.spatialItems ?? last?.spatialItems ?? 0,
    triggersFired: partial.triggersFired ?? last?.triggersFired ?? 0,
    budgetOverruns: partial.budgetOverruns ?? last?.budgetOverruns ?? "",
    glContext: partial.glContext ?? last?.glContext ?? "ok",
  };
}

export function readDebugOverlay(): DebugOverlayState | null {
  return last;
}

/** One-line HUD string when telemetry flag is on. */
export function formatDebugOverlayLine(s: DebugOverlayState): string {
  const L = s.loop;
  const ov = s.budgetOverruns ? ` ov=${s.budgetOverruns}` : "";
  return `steps=${L.stepsThisFrame} acc=${L.accHighWater.toFixed(3)} scale=${L.timeScale.toFixed(2)} pause=${L.paused ? 1 : 0} ped=${s.pedNodes}/${s.pedEdges} orph=${s.pedOrphans} occ=${s.occupancyHot ?? 0} own=${s.missionOwned ?? 0} trig=${s.triggersArmed ?? 0}/${s.triggersFired ?? 0} spat=${s.spatialItems ?? 0}/${s.spatialCells ?? 0} gl=${s.glContext ?? "ok"}${ov}`;
}
