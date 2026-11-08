/**
 * §1.6.5 Manifest-driven WorldStreamer tile list (replace hardcoded rings).
 */

import type { WorldManifest } from "./WorldManifest";

export interface StreamTile {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  priority: number;
}

/** Derive a coarse tile list from zone bounds (+ optional landmark pads). */
export function tilesFromManifest(m: WorldManifest, tileSize = 256): StreamTile[] {
  const tiles: StreamTile[] = [];
  const seen = new Set<string>();

  const addBounds = (minX: number, maxX: number, minZ: number, maxZ: number, priority: number) => {
    const sx0 = Math.floor(minX / tileSize);
    const sx1 = Math.floor(maxX / tileSize);
    const sz0 = Math.floor(minZ / tileSize);
    const sz1 = Math.floor(maxZ / tileSize);
    for (let sx = sx0; sx <= sx1; sx++) {
      for (let sz = sz0; sz <= sz1; sz++) {
        const id = `t-${sx}-${sz}`;
        if (seen.has(id)) continue;
        seen.add(id);
        tiles.push({
          id,
          minX: sx * tileSize,
          maxX: (sx + 1) * tileSize,
          minZ: sz * tileSize,
          maxZ: (sz + 1) * tileSize,
          priority,
        });
      }
    }
  };

  for (const z of m.zones) {
    addBounds(z.bounds.minX, z.bounds.maxX, z.bounds.minZ, z.bounds.maxZ, 10);
  }
  for (const mk of m.markers) {
    addBounds(mk.x - 32, mk.x + 32, mk.z - 32, mk.z + 32, 5);
  }
  for (const f of m.fronts) {
    addBounds(f.x - 48, f.x + 48, f.z - 48, f.z + 48, 8);
  }

  tiles.sort((a, b) => b.priority - a.priority);
  return tiles;
}
