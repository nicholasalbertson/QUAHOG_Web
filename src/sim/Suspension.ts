/**
 * §1.9.1 Per-wheel spring/damper + body roll/pitch coupling.
 */

export interface WheelSusp {
  compression: number;
  velocity: number;
}

export interface SuspensionState {
  fl: WheelSusp;
  fr: WheelSusp;
  rl: WheelSusp;
  rr: WheelSusp;
  roll: number;
  pitch: number;
}

export function createSuspension(): SuspensionState {
  const w = (): WheelSusp => ({ compression: 0.12, velocity: 0 });
  return { fl: w(), fr: w(), rl: w(), rr: w(), roll: 0, pitch: 0 };
}

export function stepSuspension(
  s: SuspensionState,
  opts: {
    rideHeight: number;
    spring: number;
    damper: number;
    accelForward: number;
    accelLateral: number;
    dt: number;
  },
): SuspensionState {
  const target = opts.rideHeight;
  const stepWheel = (w: WheelSusp, bias: number) => {
    const x = w.compression - (target + bias);
    const a = -opts.spring * x - opts.damper * w.velocity;
    w.velocity += a * opts.dt;
    w.compression += w.velocity * opts.dt;
    w.compression = Math.max(0.02, Math.min(0.35, w.compression));
  };
  const long = opts.accelForward * 0.01;
  const lat = opts.accelLateral * 0.01;
  stepWheel(s.fl, -long + lat);
  stepWheel(s.fr, -long - lat);
  stepWheel(s.rl, long + lat);
  stepWheel(s.rr, long - lat);
  s.roll = ((s.fr.compression + s.rr.compression) - (s.fl.compression + s.rl.compression)) * 0.5;
  s.pitch = ((s.rl.compression + s.rr.compression) - (s.fl.compression + s.fr.compression)) * 0.5;
  return s;
}
