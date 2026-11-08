/**
 * §1.2.15 Ped occupancy grid — cell → count with per-step decay.
 * Used for crowd cost and local avoidance sampling.
 */

export class OccupancyGrid {
  readonly cell: number;
  private counts = new Map<string, number>();

  constructor(cell = 4) {
    this.cell = cell;
  }

  private key(x: number, z: number): string {
    return `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
  }

  clear(): void {
    this.counts.clear();
  }

  /** Mark an agent at (x,z). */
  insert(x: number, z: number, weight = 1): void {
    const k = this.key(x, z);
    this.counts.set(k, (this.counts.get(k) ?? 0) + weight);
  }

  countAt(x: number, z: number): number {
    return this.counts.get(this.key(x, z)) ?? 0;
  }

  /** Decay all cells toward zero (call once per sim step). */
  decay(factor = 0.85): void {
    for (const [k, v] of this.counts) {
      const n = v * factor;
      if (n < 0.05) this.counts.delete(k);
      else this.counts.set(k, n);
    }
  }

  /** Sample neighborhood density for avoidance (§1.2.16). */
  sampleNeighbors(x: number, z: number, radiusCells = 1): { dx: number; dz: number; n: number } {
    let dx = 0, dz = 0, n = 0;
    const cx = Math.floor(x / this.cell);
    const cz = Math.floor(z / this.cell);
    for (let ix = -radiusCells; ix <= radiusCells; ix++) {
      for (let iz = -radiusCells; iz <= radiusCells; iz++) {
        if (ix === 0 && iz === 0) continue;
        const c = this.counts.get(`${cx + ix},${cz + iz}`) ?? 0;
        if (c <= 0) continue;
        dx -= ix * c;
        dz -= iz * c;
        n += c;
      }
    }
    return { dx, dz, n };
  }
}
