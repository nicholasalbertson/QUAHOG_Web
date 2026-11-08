/**
 * §3.5.4 Full-screen tier transition flash state.
 */

export interface TierFlashState {
  active: boolean;
  from: number;
  to: number;
  t: number;
  duration: number;
}

export function createTierFlash(): TierFlashState {
  return { active: false, from: 0, to: 0, t: 0, duration: 0.55 };
}

export function triggerTierFlash(s: TierFlashState, from: number, to: number): void {
  if (from === to) return;
  s.active = true;
  s.from = from;
  s.to = to;
  s.t = 0;
}

export function stepTierFlash(s: TierFlashState, dt: number): number {
  if (!s.active) return 0;
  s.t += dt;
  const u = Math.min(1, s.t / s.duration);
  if (u >= 1) s.active = false;
  // Opacity peaks mid-flash.
  return Math.sin(u * Math.PI) * 0.55;
}
