/**
 * §1.8.1–2 Spatial class registry with per-class cell sizes.
 */

import { SpatialIndex } from "./SpatialIndex";

export type SpatialClass = "building" | "prop" | "marker" | "vehicle" | "ped" | "boat" | "mission";

const CELL: Record<SpatialClass, number> = {
  building: 128,
  prop: 64,
  marker: 64,
  vehicle: 32,
  ped: 32,
  boat: 64,
  mission: 48,
};

export class SpatialClassRegistry {
  private indexes = new Map<SpatialClass, SpatialIndex<unknown>>();

  index<T>(cls: SpatialClass): SpatialIndex<T> {
    let ix = this.indexes.get(cls);
    if (!ix) {
      ix = new SpatialIndex({ sectorSize: CELL[cls] });
      this.indexes.set(cls, ix);
    }
    return ix as SpatialIndex<T>;
  }

  clear(): void {
    for (const ix of this.indexes.values()) ix.clear();
  }

  stats(): Record<string, { size: number; sectors: number; cell: number }> {
    const out: Record<string, { size: number; sectors: number; cell: number }> = {};
    for (const [k, ix] of this.indexes) {
      out[k] = { size: ix.size, sectors: ix.sectorCount, cell: CELL[k] };
    }
    return out;
  }
}
