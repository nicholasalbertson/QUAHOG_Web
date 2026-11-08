/**
 * §1.9.2–3 Tire model stub — slip ratio/angle + friction scale.
 */

export interface TireSample {
  slipRatio: number;
  slipAngle: number;
  longForce: number;
  latForce: number;
}

/** Pacejka-ish curves collapsed to a cheap clamp for mobile. */
export function sampleTire(
  slipRatio: number,
  slipAngle: number,
  load: number,
  frictionScale: number,
): TireSample {
  const mu = Math.max(0.2, Math.min(1.2, frictionScale));
  const longPeak = load * mu;
  const latPeak = load * mu * 0.95;
  const longForce = Math.tanh(slipRatio * 8) * longPeak;
  const latForce = -Math.tanh(slipAngle * 6) * latPeak;
  return { slipRatio, slipAngle, longForce, latForce };
}

export function slipRatio(wheelOmega: number, radius: number, vx: number): number {
  const v = Math.abs(vx) < 0.2 ? 0.2 * Math.sign(vx || 1) : vx;
  return (wheelOmega * radius - v) / Math.abs(v);
}
