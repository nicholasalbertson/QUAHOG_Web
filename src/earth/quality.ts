import { TILE_MEMORY, type TileMemoryCaps } from "./tileCaps";

// Quality tiers for the photoreal build. Auto mode steps down when frames
// or the JS heap stay hot, and steps back up only after a long calm window.
// A locked tier (the settings menu) does not auto-step, except a critical
// heap, which always drops to low so a context loss is less likely.

export type QualityName = "high" | "medium" | "low";
export type MemoryBand = "ok" | "tight" | "critical";

export interface QualityPreset {
  dprMax: number;
  errorTarget: number;
  maxBytes: number;
  maxCount: number;
  downloadJobs: number;
  parseJobs: number;
}

export const QUALITY_PRESET: Record<QualityName, QualityPreset> = {
  high: { dprMax: 1.5, errorTarget: 32, maxBytes: 280 * 1024 * 1024, maxCount: 3500, downloadJobs: 6, parseJobs: 3 },
  medium: { dprMax: 1.25, errorTarget: 40, maxBytes: 220 * 1024 * 1024, maxCount: 2800, downloadJobs: 5, parseJobs: 2 },
  low: { dprMax: 1, errorTarget: 48, maxBytes: 160 * 1024 * 1024, maxCount: 2000, downloadJobs: 3, parseJobs: 2 },
};

const ORDER: QualityName[] = ["high", "medium", "low"];

export function memoryBand(usedBytes: number | null, limitBytes: number | null): MemoryBand {
  if (usedBytes == null || limitBytes == null || !(limitBytes > 0) || !Number.isFinite(usedBytes)) return "ok";
  const ratio = usedBytes / limitBytes;
  if (ratio >= 0.85) return "critical";
  if (ratio >= 0.72) return "tight";
  return "ok";
}

export function stepDown(tier: QualityName): QualityName {
  const i = ORDER.indexOf(tier);
  return ORDER[Math.min(ORDER.length - 1, i + 1)];
}

export function stepUp(tier: QualityName): QualityName {
  const i = ORDER.indexOf(tier);
  return ORDER[Math.max(0, i - 1)];
}

/**
 * Next tier from a rolling frame window.
 * `samples` is how many frames are in the window. `meanS` is their mean seconds.
 * Below 60 samples, nothing changes. A step up wants 180 calm frames.
 */
export function nextQuality(
  current: QualityName,
  meanS: number,
  samples: number,
  memory: MemoryBand,
  locked: boolean,
): QualityName {
  if (memory === "critical") return "low";
  if (memory === "tight" && current === "high") return "medium";
  if (locked) return current;
  if (samples < 60 || !Number.isFinite(meanS)) return current;
  if (meanS > 0.033) return stepDown(current);
  if (samples >= 180 && meanS < 0.018 && memory === "ok") return stepUp(current);
  return current;
}

export function capsForTier(name: QualityName): TileMemoryCaps {
  const preset = QUALITY_PRESET[name];
  return {
    errorTarget: preset.errorTarget,
    minBytes: Math.round(preset.maxBytes * 0.64),
    maxBytes: preset.maxBytes,
    minCount: Math.round(preset.maxCount * 0.71),
    maxCount: preset.maxCount,
    maxDepth: TILE_MEMORY.maxDepth,
    downloadJobs: preset.downloadJobs,
    parseJobs: preset.parseJobs,
  };
}

export function meanOf(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const n of samples) sum += n;
  return sum / samples.length;
}
