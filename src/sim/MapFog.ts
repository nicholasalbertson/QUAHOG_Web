/**
 * §10.2.2 Fog-of-war — explored cells reveal over time.
 */

export class MapFog {
  readonly cellSize: number;
  private explored = new Set<string>();

  constructor(cellSize = 64) {
    this.cellSize = cellSize;
  }

  private key(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  reveal(x: number, z: number, ring = 1): number {
    let n = 0;
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dz = -ring; dz <= ring; dz++) {
        const k = `${cx + dx},${cz + dz}`;
        if (!this.explored.has(k)) {
          this.explored.add(k);
          n++;
        }
      }
    }
    return n;
  }

  isExplored(x: number, z: number): boolean {
    return this.explored.has(this.key(x, z));
  }

  get size(): number {
    return this.explored.size;
  }

  serialize(): string[] {
    return [...this.explored];
  }

  load(keys: string[]): void {
    this.explored = new Set(keys);
  }
}
