import { describe, expect, it } from "vitest";
import { SpatialIndex } from "../../sim/SpatialIndex";
import { witnessesWithLos, type WitnessActor } from "../../sim/WitnessLos";

describe("§1.8 spatial perf / LOS matrix", () => {
  it("§1.8.9 2000 entities × 500 radius queries stays cheap", () => {
    const ix = new SpatialIndex<{ id: number; x: number; z: number }>({ sectorSize: 32 });
    const items: { id: number; x: number; z: number }[] = [];
    for (let i = 0; i < 2000; i++) {
      const it = { id: i, x: (i % 50) * 10, z: Math.floor(i / 50) * 10 };
      items.push(it);
      ix.insert(it, it.x, it.z);
    }
    const t0 = performance.now();
    for (let q = 0; q < 500; q++) {
      const x = (q % 40) * 12;
      const z = Math.floor(q / 40) * 12;
      ix.queryRadius(x, z, 40, (a) => ({ x: a.x, z: a.z }));
    }
    const ms = performance.now() - t0;
    // Generous CI bound (Device A target is tighter).
    expect(ms).toBeLessThan(250);
  });

  it("§1.8.10 LOS segment agrees with clear vs occluded cases", () => {
    const ix = new SpatialIndex<WitnessActor>({ sectorSize: 32 });
    const a: WitnessActor = { id: "a", x: 0, z: 0, kind: "ped" };
    const b: WitnessActor = { id: "b", x: 20, z: 0, kind: "cop" };
    const wall: WitnessActor = { id: "wall", x: 10, z: 0, kind: "ped" };
    ix.insert(a, a.x, a.z);
    ix.insert(b, b.x, b.z);
    const clear = witnessesWithLos(ix, { x: 20, z: 0 }, 40);
    expect(clear.some((w) => w.id === "a")).toBe(true);
    ix.insert(wall, wall.x, wall.z);
    const blocked = witnessesWithLos(ix, { x: 20, z: 0 }, 40);
    // Occluder on segment → a should not report clear LOS to player at b.
    expect(blocked.some((w) => w.id === "a")).toBe(false);
  });
});
