/**
 * §2.4 Locomotion animation state — idle/walk/run/jump/fall/land + turn-in-place.
 * Logic stub for earth/stylized anim drivers.
 */

export type LocoPhase = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "turn";

export interface LocoState {
  phase: LocoPhase;
  speedBlend: number; // 0 idle .. 1 run
  turnYaw: number;
  airT: number;
  landT: number;
}

export function createLoco(): LocoState {
  return { phase: "idle", speedBlend: 0, turnYaw: 0, airT: 0, landT: 0 };
}

export function stepLoco(
  s: LocoState,
  dt: number,
  opts: { speed: number; sprint: boolean; grounded: boolean; jump: boolean; yawDelta: number },
): LocoPhase {
  const walkSpeed = 1.2;
  const runSpeed = 4.5;

  if (!opts.grounded) {
    s.airT += dt;
    s.phase = opts.speed < 0.1 && s.airT < 0.35 ? "jump" : "fall";
    s.speedBlend = 0;
    return s.phase;
  }

  if (s.phase === "fall" || s.phase === "jump") {
    s.phase = "land";
    s.landT = 0.2;
    s.airT = 0;
  }
  if (s.phase === "land") {
    s.landT -= dt;
    if (s.landT > 0) return "land";
  }

  if (opts.jump) {
    s.phase = "jump";
    s.airT = 0;
    return "jump";
  }

  if (Math.abs(opts.yawDelta) > 1.2 && opts.speed < 0.4) {
    s.phase = "turn";
    s.turnYaw = opts.yawDelta;
    return "turn";
  }

  const target = opts.speed < 0.15 ? 0 : opts.sprint || opts.speed > runSpeed * 0.7 ? 1 : 0.45;
  s.speedBlend += (target - s.speedBlend) * Math.min(1, dt * 8);
  if (s.speedBlend < 0.08) s.phase = "idle";
  else if (s.speedBlend < 0.7) s.phase = "walk";
  else s.phase = "run";
  void walkSpeed;
  return s.phase;
}
