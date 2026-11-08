/**
 * §5.2.5 Recoil/accuracy — bloom, recovery, ADS.
 */

export interface RecoilState {
  bloom: number;
  ads: boolean;
}

export function createRecoil(): RecoilState {
  return { bloom: 0, ads: false };
}

export function fireRecoil(s: RecoilState, kick = 0.18): void {
  const adsMul = s.ads ? 0.45 : 1;
  s.bloom = Math.min(1, s.bloom + kick * adsMul);
}

export function stepRecoil(s: RecoilState, dt: number, recover = 1.6): void {
  s.bloom = Math.max(0, s.bloom - recover * dt * (s.ads ? 1.4 : 1));
}

/** Spread radians for hitscan jitter. */
export function spreadRadians(s: RecoilState, base = 0.02): number {
  return base + s.bloom * 0.12;
}
