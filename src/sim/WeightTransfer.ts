/**
 * §1.9.5 Weight transfer under accel/brake/corner.
 */

export interface WeightSample {
  fl: number;
  fr: number;
  rl: number;
  rr: number;
}

export function weightTransfer(
  mass: number,
  accelForward: number,
  accelLateral: number,
  wheelbase = 2.6,
  track = 1.6,
): WeightSample {
  const staticW = mass * 9.81 / 4;
  const long = (mass * accelForward * wheelbase * 0.12);
  const lat = (mass * accelLateral * track * 0.12);
  return {
    fl: Math.max(50, staticW - long / 2 + lat / 2),
    fr: Math.max(50, staticW - long / 2 - lat / 2),
    rl: Math.max(50, staticW + long / 2 + lat / 2),
    rr: Math.max(50, staticW + long / 2 - lat / 2),
  };
}
