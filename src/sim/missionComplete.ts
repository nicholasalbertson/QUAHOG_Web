// Mission step completion (§2.8.1) — the shared rule, used by both the
// stylized MissionRunner and the earth EarthMissionRunner. A step completes
// when the player is inside the target radius (and in a car when the step
// needs one, and heat-free when the step needs no heat). Pure, so the
// mission state machine is testable without a canvas.
import type { MissionStep } from "../mission";

export interface StepContext {
  /** Player position in slice world coords (x = easting, z = world z). */
  pos: { x: number; z: number };
  /** True when the player is driving (car mode). */
  driving: boolean;
  /** Current wanted level (0..5). Earth has no police yet (§2.8.2), so it
   *  passes 0 — noHeat steps complete there until heat exists. */
  police: number;
}

export function stepComplete(step: MissionStep, ctx: StepContext): boolean {
  if (step.needCar && !ctx.driving) return false;
  if (step.noHeat && ctx.police >= 1) return false;
  if (step.target) {
    const d = Math.hypot(ctx.pos.x - step.target[0], ctx.pos.z - step.target[2]);
    if (d > (step.radius ?? 10)) return false;
  }
  return true;
}
