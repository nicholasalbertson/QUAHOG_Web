/**
 * §3.4 Faction territory — polygons + aggro on hostile entry.
 */

export interface FactionPoly {
  id: string;
  faction: string;
  /** XZ polygon (closed implied). */
  points: { x: number; z: number }[];
  hostile?: boolean;
}

export interface FactionHeat {
  faction: string;
  heat: number;
}

function pointInPoly(x: number, z: number, poly: { x: number; z: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export class FactionTerritory {
  private polys: FactionPoly[] = [];
  private heat = new Map<string, number>();

  setPolygons(polys: FactionPoly[]): void {
    this.polys = polys;
  }

  /** Which faction owns the point, if any. */
  at(x: number, z: number): FactionPoly | null {
    for (const p of this.polys) {
      if (pointInPoly(x, z, p.points)) return p;
    }
    return null;
  }

  /** §3.4.2 Aggro on entry while hostile. */
  enter(x: number, z: number, dt: number): { faction: string; heat: number } | null {
    const p = this.at(x, z);
    if (!p || !p.hostile) return null;
    const next = Math.min(5, (this.heat.get(p.faction) ?? 0) + dt * 1.2);
    this.heat.set(p.faction, next);
    return { faction: p.faction, heat: next };
  }

  /** §3.4.4 Decay outside territory. */
  decayOutside(x: number, z: number, dt: number): void {
    const here = this.at(x, z)?.faction;
    for (const [f, h] of this.heat) {
      if (f === here) continue;
      const n = Math.max(0, h - dt * 0.25);
      if (n <= 0) this.heat.delete(f);
      else this.heat.set(f, n);
    }
  }

  heatOf(faction: string): number {
    return this.heat.get(faction) ?? 0;
  }

  serialize(): FactionHeat[] {
    return [...this.heat.entries()].map(([faction, heat]) => ({ faction, heat }));
  }
}
