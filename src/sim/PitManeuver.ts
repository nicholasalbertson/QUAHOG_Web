/**
 * §3.3.5 PIT — bounded impulse with cooldown.
 */

export interface PitState {
  cooldown: number;
  lastImpulse: number;
}

export function createPit(): PitState {
  return { cooldown: 0, lastImpulse: 0 };
}

export function stepPitCooldown(p: PitState, dt: number): void {
  p.cooldown = Math.max(0, p.cooldown - dt);
}

/**
 * Attempt PIT when alongside target. Returns yaw impulse for target, or 0.
 */
export function tryPit(
  p: PitState,
  opts: { alongside: boolean; relativeSpeed: number; cooldownSec?: number },
): number {
  if (p.cooldown > 0 || !opts.alongside) return 0;
  if (Math.abs(opts.relativeSpeed) < 4) return 0;
  const impulse = Math.sign(opts.relativeSpeed || 1) * Math.min(2.2, Math.abs(opts.relativeSpeed) * 0.15);
  p.lastImpulse = impulse;
  p.cooldown = opts.cooldownSec ?? 4;
  return impulse;
}
