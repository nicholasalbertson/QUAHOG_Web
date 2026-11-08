// Locomotion gait math (§2.4) — pure, so the blend tree is unit-testable
// without rendering a Character. The Character component calls stepGait
// each frame and applies the returned joint values.
//
// Speed: 0 idle, 1 walk, 2 run/sprint. The gait blends 0→1 at 8/s (no
// popping on transitions); the phase rate + swing amplitude scale with
// speed (walk 9 rad/s + 0.6 amp, run 14 rad/s + 0.85 amp). Idle breathing
// is a slow 0.25 Hz sine that blends out as the gait comes in.
export interface GaitState {
  phase: number;
  gait: number; // 0 idle → 1 moving (blended)
  breath: number; // idle-breathing clock (radians)
  air: number; // 0 grounded → 1 airborne (blended at 10/s)
}

export interface GaitPose {
  legL: number;
  legR: number;
  armL: number;
  armR: number;
  bobY: number;
  torsoPitch: number;
}

export function clampSpeed(spd: number): number {
  return Math.min(2, Math.max(0, spd));
}

export function stepGait(s: GaitState, spdRaw: number, dtRaw: number, airborne = false): GaitPose {
  const dt = Math.min(dtRaw, 0.05);
  const spd = clampSpeed(spdRaw);
  const want = spd > 0.05 ? 1 : 0;
  s.gait += (want - s.gait) * Math.min(1, dt * 8);
  const run = Math.max(0, spd - 1);
  const rate = 9 + 5 * run;
  s.phase += dt * rate * s.gait;
  const amp = (0.6 + 0.25 * run) * s.gait;
  const swing = Math.sin(s.phase) * amp;
  s.breath += dt * Math.PI * 2 * 0.25;
  const idle = 1 - s.gait;
  const breathSin = Math.sin(s.breath);
  // §2.4.5 — airborne pose: legs tucked, arms up, no bob. Blends in/out
  // at 10/s so a jump doesn't pop the pose.
  s.air += ((airborne ? 1 : 0) - s.air) * Math.min(1, dt * 10);
  const a = s.air;
  return {
    legL: swing * (1 - a) + -0.6 * a,
    legR: -swing * (1 - a) + 0.4 * a,
    armL: (-swing * 0.8 + breathSin * 0.03 * idle) * (1 - a) + -0.8 * a,
    armR: (swing * 0.8 - breathSin * 0.03 * idle) * (1 - a) + -0.8 * a,
    bobY: (Math.abs(Math.sin(s.phase)) * 0.05 * s.gait + breathSin * 0.012 * idle) * (1 - a),
    torsoPitch: breathSin * 0.02 * idle * (1 - a) + 0.1 * a,
  };
}

/** §2.4.7 — turn-in-place: slew `current` toward `target` at most
 *  `maxRateRadS * dt`, taking the short way around (wraparound-aware).
 *  A 180° reversal at 360°/s takes 0.5 s — the character visibly turns
 *  in place instead of snapping. */
export function slewHeading(current: number, target: number, maxRateRadS: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const maxStep = maxRateRadS * dt;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

/** §2.4.5 — jump/fall/land physics. Gravity 22 m/s², jump velocity
 *  6.5 m/s (~1 m apex). `s.y` is height above ground (0 = grounded).
 *  Returns whether the player jumped or landed on this step. */
export interface JumpState {
  y: number; // current height above ground (0 = grounded)
  vy: number;
  grounded: boolean;
}

export const JUMP_VELOCITY = 6.5;
export const GRAVITY = 22;

export function stepJump(s: JumpState, dtRaw: number, jumpPressed: boolean): { jumped: boolean; landed: boolean } {
  const dt = Math.min(dtRaw, 0.05);
  let jumped = false;
  let landed = false;
  if (jumpPressed && s.grounded) {
    s.vy = JUMP_VELOCITY;
    s.grounded = false;
    jumped = true;
  }
  if (!s.grounded) {
    s.vy -= GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
      s.grounded = true;
      landed = true;
    }
  } else {
    s.y = 0;
  }
  return { jumped, landed };
}

/** Foot speed (m/s) from the gait: 0 idle, 4.5 walk, 9 run — matches the
 *  earth PlayerRig's foot speeds, so the visual cycle matches the travel. */
export function gaitSpeedMps(spd: number): number {
  const s = clampSpeed(spd);
  return s <= 0 ? 0 : s <= 1 ? 4.5 * s : 4.5 + 4.5 * (s - 1);
}
