// How the photoreal queue decides which tile to fetch, and when the street
// around the camera has finished refining. Pure so the soak can lock it
// without a WebGL context.

export interface TileQueueItem {
  traversal?: {
    inFrustum?: boolean;
    error?: number;
    distanceFromCamera?: number;
  };
}

/** 1 means `a` should load first. In-view tiles beat off-screen ones, a very
 *  coarse tile still comes in so the sky is not empty, then nearer tiles. */
export function streetTilePriority(a: TileQueueItem, b: TileQueueItem): number {
  const af = a.traversal?.inFrustum ? 1 : 0;
  const bf = b.traversal?.inFrustum ? 1 : 0;
  if (af !== bf) return af > bf ? 1 : -1;
  const ae = a.traversal?.error ?? 0;
  const be = b.traversal?.error ?? 0;
  if (ae !== be && (ae > 64 || be > 64)) return ae > be ? 1 : -1;
  const ad = a.traversal?.distanceFromCamera ?? Number.POSITIVE_INFINITY;
  const bd = b.traversal?.distanceFromCamera ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad < bd ? 1 : -1;
  return 0;
}

export interface NearTile {
  distance: number;
  loading: boolean;
  /** Screen-space error of the tile that is currently drawn. */
  error: number;
  hasChildren: boolean;
}

export interface RefineReport {
  pending: number;
  near: number;
  settled: boolean;
}

/** Settled when something is loaded inside `radius` and none of it is still
 *  downloading or coarser than `errorTarget`. */
export function refineReport(tiles: readonly NearTile[], radius: number, errorTarget: number): RefineReport {
  let pending = 0;
  let near = 0;
  for (const tile of tiles) {
    if (!(tile.distance <= radius)) continue;
    near += 1;
    if (tile.loading || (tile.hasChildren && tile.error > errorTarget)) pending += 1;
  }
  return { pending, near, settled: near > 0 && pending === 0 };
}
