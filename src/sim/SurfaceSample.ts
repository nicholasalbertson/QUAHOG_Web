/**
 * §1.9.4 Per-wheel surface sample from WorldManifest / road polygons (stub).
 */

import type { Surface } from "./ClockWeather";

export interface SurfacePoly {
  id: string;
  surface: Surface;
  points: { x: number; z: number }[];
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

export class SurfaceSampler {
  private polys: SurfacePoly[] = [];
  private fallback: Surface = "asphalt";

  setPolygons(polys: SurfacePoly[]): void {
    this.polys = polys;
  }

  setFallback(s: Surface): void {
    this.fallback = s;
  }

  at(x: number, z: number): Surface {
    for (const p of this.polys) {
      if (inside(x, z, p.points)) return p.surface;
    }
    return this.fallback;
  }

  /** Sample four wheel positions from vehicle pose. */
  wheels(
    x: number,
    z: number,
    yaw: number,
    wheelbase = 2.6,
    track = 1.6,
  ): { fl: Surface; fr: Surface; rl: Surface; rr: Surface } {
    const hx = Math.sin(yaw) * (wheelbase / 2);
    const hz = Math.cos(yaw) * (wheelbase / 2);
    const tx = Math.cos(yaw) * (track / 2);
    const tz = -Math.sin(yaw) * (track / 2);
    return {
      fl: this.at(x + hx + tx, z + hz + tz),
      fr: this.at(x + hx - tx, z + hz - tz),
      rl: this.at(x - hx + tx, z - hz + tz),
      rr: this.at(x - hx - tx, z - hz - tz),
    };
  }
}
