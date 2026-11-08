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
  /** §1.8.3 Identity map so dynamic remove works by id. */
  private byId = new Map<string, { cls: SpatialClass; item: unknown }>();

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
    this.byId.clear();
  }

  /** §1.8.3 Dynamic insert for live vehicles/peds/boats/mission entities. */
  upsert<T>(cls: SpatialClass, id: string, item: T, x: number, z: number): void {
    const prev = this.byId.get(id);
    if (prev) this.index(prev.cls).remove(prev.item);
    this.index<T>(cls).insert(item, x, z);
    this.byId.set(id, { cls, item });
  }

  remove(id: string): void {
    const prev = this.byId.get(id);
    if (!prev) return;
    this.index(prev.cls).remove(prev.item);
    this.byId.delete(id);
  }

  stats(): Record<string, { size: number; sectors: number; cell: number }> {
    const out: Record<string, { size: number; sectors: number; cell: number }> = {};
    for (const [k, ix] of this.indexes) {
      out[k] = { size: ix.size, sectors: ix.sectorCount, cell: CELL[k] };
    }
    return out;
  }
}
