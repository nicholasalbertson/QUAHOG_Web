/**
 * §1.3.39 Authoring API — defineMission(...) with validation.
 */

import type { ConditionNode } from "./Conditions";
import { validateCondition } from "./Conditions";
import type { Trigger } from "./Triggers";

export interface MissionStepDef {
  id: string;
  objective: string;
  optional?: boolean;
  hidden?: boolean;
  failSec?: number | null;
  target?: { x: number; y?: number; z: number };
  condition?: ConditionNode;
  triggers?: Trigger[];
}

export interface MissionDef {
  id: string;
  title: string;
  steps: MissionStepDef[];
  /** Parallel step groups (step ids). */
  parallel?: string[][];
}

export interface MissionAuthResult {
  ok: boolean;
  errors: string[];
  def?: MissionDef;
}

export function defineMission(raw: unknown): MissionAuthResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["mission must be object"] };
  const d = raw as MissionDef;
  if (!d.id) errors.push("id required");
  if (!d.title) errors.push("title required");
  if (!Array.isArray(d.steps) || d.steps.length === 0) errors.push("steps: non-empty array required");
  else {
    const ids = new Set<string>();
    d.steps.forEach((s, i) => {
      if (!s.id) errors.push(`steps[${i}].id required`);
      else if (ids.has(s.id)) errors.push(`duplicate step id ${s.id}`);
      else ids.add(s.id);
      if (!s.objective) errors.push(`steps[${i}].objective required`);
      if (s.condition) {
        for (const e of validateCondition(s.condition)) errors.push(`steps[${i}].condition ${e}`);
      }
    });
    if (d.parallel) {
      for (const group of d.parallel) {
        for (const id of group) {
          if (!ids.has(id)) errors.push(`parallel refs unknown step ${id}`);
        }
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], def: d };
}
