// Shared frame ladder for the street build. The tiles build keeps its own
// high/medium/low presets in src/earth/quality.ts and uses the same idea:
// a hot frame steps the picture down. This one never steps up on its own,
// so a player who picked High is only dropped when the frames stay slow.

export type StreetTier = 0 | 1 | 2;

export function nextStreetTier(tier: StreetTier, meanFrameSec: number, samples: number): StreetTier {
  if (samples < 60 || !Number.isFinite(meanFrameSec)) return tier;
  if (meanFrameSec > 0.034 && tier > 0) return (tier - 1) as StreetTier;
  return tier;
}
