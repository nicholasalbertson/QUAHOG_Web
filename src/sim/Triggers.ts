/**
 * §1.3.12–18 Mission triggers — volume / distance / timer with fire-once.
 */

export type TriggerKind = "sphere" | "aabb" | "distance" | "timer" | "flag";

export interface TriggerBase {
  id: string;
  kind: TriggerKind;
  fireOnce?: boolean;
  armed?: boolean;
  fired?: boolean;
}

export interface SphereTrigger extends TriggerBase {
  kind: "sphere";
  x: number;
  z: number;
  r: number;
}

export interface AabbTrigger extends TriggerBase {
  kind: "aabb";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DistanceTrigger extends TriggerBase {
  kind: "distance";
  x: number;
  z: number;
  r: number;
}

export interface TimerTrigger extends TriggerBase {
  kind: "timer";
  duration: number;
  elapsed?: number;
}

export interface FlagTrigger extends TriggerBase {
  kind: "flag";
  flagKey: string;
  expect: boolean;
}

export type Trigger = SphereTrigger | AabbTrigger | DistanceTrigger | TimerTrigger | FlagTrigger;

export interface TriggerEvalCtx {
  x: number;
  z: number;
  dt: number;
  flag?: (key: string) => boolean;
}

/** Evaluate one trigger; returns true when it fires this tick. */
export function evalTrigger(t: Trigger, ctx: TriggerEvalCtx): boolean {
  if (t.armed === false) return false;
  if (t.fireOnce !== false && t.fired) return false;

  let hit = false;
  switch (t.kind) {
    case "sphere":
    case "distance": {
      const d = Math.hypot(ctx.x - t.x, ctx.z - t.z);
      hit = d <= t.r;
      break;
    }
    case "aabb":
      hit = ctx.x >= t.minX && ctx.x <= t.maxX && ctx.z >= t.minZ && ctx.z <= t.maxZ;
      break;
    case "timer":
      t.elapsed = (t.elapsed ?? 0) + ctx.dt;
      hit = t.elapsed >= t.duration;
      break;
    case "flag":
      hit = (ctx.flag?.(t.flagKey) ?? false) === t.expect;
      break;
  }
  if (!hit) return false;
  t.fired = true;
  if (t.fireOnce === false) {
    /* stay armed for re-entry edges — caller may rearm */
  }
  return true;
}

export function rearm(t: Trigger): void {
  t.fired = false;
  t.armed = true;
  if (t.kind === "timer") t.elapsed = 0;
}
