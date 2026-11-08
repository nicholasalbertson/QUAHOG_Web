/**
 * §1.9.10 Brake/ABS — pulse brake force when slip exceeds threshold.
 */

export interface AbsState {
  braking: boolean;
  pulsing: boolean;
  slip: number;
  force: number;
}

export function stepAbs(
  brakeInput: number,
  slipRatio: number,
  dt: number,
  threshold = 0.22,
  /** Sim elapsed for deterministic pulse phase. */
  elapsed = 0,
): AbsState {
  const braking = brakeInput > 0.05;
  if (!braking) return { braking: false, pulsing: false, slip: slipRatio, force: 0 };
  const over = Math.abs(slipRatio) > threshold;
  // Square-wave pulse ~12 Hz when locking.
  const phase = Math.floor(elapsed * 12) % 2 === 0;
  const pulsing = over;
  const force = pulsing && !phase ? brakeInput * 0.35 : brakeInput;
  return { braking, pulsing, slip: slipRatio, force: force * Math.min(1, dt * 60) };
}
