// Hard scene budget. A city slice can hold thousands of footprints. Meshing
// all of them is what blows the GPU context and leaves a black canvas.
// Callers keep the nearest objects and drop the rest.

import type { Quality } from "../quality";

export interface SceneCaps {
  drawCalls: number;
  triangles: number;
  textures: number;
  gpuBytes: number;
  /** JS heap the soak treats as a failure. */
  heapBytes: number;
  /** Concurrent characters that would otherwise be skinned. */
  skinned: number;
  buildingRadius: number;
  buildingCap: number;
  roadRadius: number;
  roadCap: number;
  /** Highways stay drivable further out than local streets, then drop too. */
  highwayRadius: number;
  propRadius: number;
}

const DESKTOP: Record<Quality, SceneCaps> = {
  2: {
    drawCalls: 1600, triangles: 1_800_000, textures: 160, gpuBytes: 280 * 1024 * 1024, heapBytes: 512 * 1024 * 1024,
    skinned: 12, buildingRadius: 700, buildingCap: 280, roadRadius: 900, roadCap: 500, highwayRadius: 2200, propRadius: 220,
  },
  1: {
    drawCalls: 1100, triangles: 1_100_000, textures: 110, gpuBytes: 180 * 1024 * 1024, heapBytes: 384 * 1024 * 1024,
    skinned: 8, buildingRadius: 480, buildingCap: 160, roadRadius: 640, roadCap: 320, highwayRadius: 1600, propRadius: 160,
  },
  0: {
    drawCalls: 700, triangles: 650_000, textures: 72, gpuBytes: 96 * 1024 * 1024, heapBytes: 256 * 1024 * 1024,
    skinned: 6, buildingRadius: 320, buildingCap: 80, roadRadius: 420, roadCap: 180, highwayRadius: 1100, propRadius: 120,
  },
};

export function sceneCaps(quality: Quality, mobile = false): SceneCaps {
  const base = DESKTOP[quality] ?? DESKTOP[1];
  if (!mobile) return base;
  return {
    ...base,
    skinned: 6,
    drawCalls: Math.min(base.drawCalls, 700),
    triangles: Math.min(base.triangles, 650_000),
    textures: Math.min(base.textures, 72),
    gpuBytes: Math.min(base.gpuBytes, 96 * 1024 * 1024),
    heapBytes: Math.min(base.heapBytes, 256 * 1024 * 1024),
    buildingRadius: Math.min(base.buildingRadius, 320),
    buildingCap: Math.min(base.buildingCap, 80),
    roadRadius: Math.min(base.roadRadius, 420),
    roadCap: Math.min(base.roadCap, 180),
    highwayRadius: Math.min(base.highwayRadius, 1100),
    propRadius: Math.min(base.propRadius, 120),
  };
}

const HIGHWAY = new Set([
  "motorway", "trunk", "primary",
  "motorway_link", "trunk_link", "primary_link",
]);

export function isKeptHighway(highway: string | undefined): boolean {
  return !!highway && HIGHWAY.has(highway);
}

function centerOf(points: readonly [number, number][] | undefined): [number, number] | null {
  if (!points || points.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const [e, n] of points) { x += e; y += n; }
  return [x / points.length, y / points.length];
}

export function windowBuildings<T extends { footprint?: [number, number][] }>(
  buildings: readonly T[],
  anchor: [number, number],
  radius: number,
  cap: number,
): T[] {
  const ranked: { item: T; d: number }[] = [];
  for (const item of buildings) {
    const c = centerOf(item.footprint);
    if (!c) continue;
    const d = Math.hypot(c[0] - anchor[0], c[1] - anchor[1]);
    if (d <= radius) ranked.push({ item, d });
  }
  ranked.sort((a, b) => a.d - b.d);
  return ranked.slice(0, Math.max(0, cap)).map((row) => row.item);
}

export function windowRoads<T extends { highway?: string; points: [number, number][] }>(
  roads: readonly T[],
  anchor: [number, number],
  radius: number,
  cap: number,
  highwayRadius = radius * 2,
): T[] {
  const highways: T[] = [];
  const ranked: { item: T; d: number }[] = [];
  for (const item of roads) {
    const mid = item.points[Math.floor(item.points.length / 2)] ?? item.points[0];
    if (!mid) continue;
    const d = Math.hypot(mid[0] - anchor[0], mid[1] - anchor[1]);
    if (isKeptHighway(item.highway)) {
      if (d <= highwayRadius) highways.push(item);
      continue;
    }
    if (d <= radius) ranked.push({ item, d });
  }
  ranked.sort((a, b) => a.d - b.d);
  return highways.concat(ranked.slice(0, Math.max(0, cap)).map((row) => row.item));
}

/** A frame is black when almost every sampled pixel is unlit. */
export function frameIsBlack(pixels: ArrayLike<number>, channels = 4): boolean {
  const n = Math.floor(pixels.length / channels);
  if (n < 4) return true;
  let lit = 0;
  for (let i = 0; i < n; i++) {
    const o = i * channels;
    if (pixels[o] + pixels[o + 1] + pixels[o + 2] > 24) lit++;
  }
  return lit < n / 40;
}

/** What a context-loss listener must do so the canvas can come back. */
export function contextLostPlan(): { preventDefault: true; quality: 0 } {
  return { preventDefault: true, quality: 0 };
}

/** Largest texture edge for this tier. KTX2 encoding is not in the toolchain yet. */
export function textureEdge(quality: Quality): number {
  return quality >= 2 ? 1024 : quality === 1 ? 512 : 256;
}

export function downscaleTexture(width: number, height: number, quality: Quality): { width: number; height: number } {
  const edge = textureEdge(quality);
  const longest = Math.max(width, height, 1);
  if (longest <= edge) return { width, height };
  const scale = edge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function heapOverBudget(usedBytes: number, caps: SceneCaps): boolean {
  return usedBytes > caps.heapBytes;
}

export function overBudget(
  sample: { drawCalls: number; triangles: number },
  caps: SceneCaps,
): boolean {
  return sample.drawCalls > caps.drawCalls || sample.triangles > caps.triangles;
}
