// Hard memory bounds for the photoreal tiles renderer. These are caps, not
// measured quality settings: the screen-space error target stays the detail
// knob, and the depth cap only stops runaway refinement.
//
// 3d-tiles-renderer treats maxDepth as exclusive of the next child:
// refinement stops when `tile.internal.depth + 1 >= maxDepth`.
// GoogleCloudAuthPlugin's default `useRecommendedSettings` overwrites
// errorTarget to 20 during init. Callers pass `useRecommendedSettings: false`
// and apply this object afterwards so the explicit target sticks.

export const TILE_MEMORY = {
  /** Screen-space error in pixels. Lower is sharper. 8 holds street facades; 32 left them soft. */
  errorTarget: 8,
  minBytes: 300 * 1024 * 1024,
  maxBytes: 384 * 1024 * 1024,
  /** Must stay below maxCount. A high floor keeps nearby tiles from being evicted for distant ones. */
  minCount: 4200,
  maxCount: 5200,
  maxDepth: 32,
  downloadJobs: 14,
  parseJobs: 6,
} as const;

export interface TileMemoryHost {
  errorTarget?: number;
  maxDepth?: number;
  lruCache?: { minBytesSize: number; maxBytesSize: number; minSize: number; maxSize: number };
  downloadQueue?: { maxJobs: number };
  parseQueue?: { maxJobs: number };
}

export interface TileMemoryCaps {
  errorTarget: number;
  minBytes: number;
  maxBytes: number;
  minCount: number;
  maxCount: number;
  maxDepth: number;
  downloadJobs: number;
  parseJobs: number;
}

export function applyTileMemoryCaps(tiles: TileMemoryHost, caps: TileMemoryCaps = TILE_MEMORY): void {
  tiles.errorTarget = caps.errorTarget;
  tiles.maxDepth = caps.maxDepth;
  if (tiles.lruCache) {
    tiles.lruCache.minBytesSize = caps.minBytes;
    tiles.lruCache.maxBytesSize = caps.maxBytes;
    tiles.lruCache.minSize = caps.minCount;
    tiles.lruCache.maxSize = caps.maxCount;
  }
  if (tiles.downloadQueue) tiles.downloadQueue.maxJobs = caps.downloadJobs;
  if (tiles.parseQueue) tiles.parseQueue.maxJobs = caps.parseJobs;
}
