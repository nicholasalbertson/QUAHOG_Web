// Graphics quality presets — tune streaming radius and far-tile detail.

export type Quality = 0 | 1 | 2;

export const QUALITY_LABELS = ["Low", "Medium", "High"] as const;

/** Tile ring radius. Quality 0 is slightly reduced (LOD stub). */
export function viewRadius(q: Quality): number {
  return [2, 3, 4][q];
}

export function collideRadius(q: Quality): number {
  return [1, 1, 2][q];
}

export function tileImpostor(q: Quality, ring: number, viewR: number): boolean {
  return q < 2 && ring >= viewR;
}
