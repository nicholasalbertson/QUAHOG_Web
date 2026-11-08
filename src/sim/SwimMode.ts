/**
 * §5.3.6 / §7.4 Swim mode stub.
 */

export interface SwimState {
  active: boolean;
  stamina: number;
  depth: number;
}

export function createSwim(): SwimState {
  return { active: false, stamina: 1, depth: 0 };
}

export function stepSwim(
  s: SwimState,
  opts: { inWater: boolean; throttle: number; dt: number },
): SwimState {
  s.active = opts.inWater;
  if (!s.active) {
    s.stamina = Math.min(1, s.stamina + opts.dt * 0.15);
    s.depth = 0;
    return s;
  }
  s.depth = Math.max(0.4, s.depth);
  const drain = 0.04 + Math.abs(opts.throttle) * 0.08;
  s.stamina = Math.max(0, s.stamina - drain * opts.dt);
  return s;
}

export function swimSpeed(s: SwimState, throttle: number): number {
  if (!s.active) return 0;
  return throttle * 2.2 * (0.35 + s.stamina * 0.65);
}
