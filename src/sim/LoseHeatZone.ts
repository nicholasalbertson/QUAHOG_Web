/**
 * §3.5.3 Lose-heat zones — polygons with accelerated decay.
 */

export interface LoseHeatZone {
  id: string;
  points: { x: number; z: number }[];
  mul: number;
}

function inside(x: number, z: number, poly: { x: number; z: number }[]): boolean {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) ok = !ok;
  }
  return ok;
}

export class LoseHeatZones {
  private zones: LoseHeatZone[] = [];

  setZones(z: LoseHeatZone[]): void {
    this.zones = z;
  }

  /** Decay multiplier (≥1) when inside a zone. */
  mulAt(x: number, z: number): number {
    let m = 1;
    for (const zone of this.zones) {
      if (inside(x, z, zone.points)) m = Math.max(m, zone.mul);
    }
    return m;
  }

  inZone(x: number, z: number): LoseHeatZone | null {
    for (const zone of this.zones) {
      if (inside(x, z, zone.points)) return zone;
    }
    return null;
  }
}
