import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DISTRICTS } from "../districts";
import {
  applySlicePart,
  chunkSlice,
  emptySliceAcc,
  parseSliceText,
} from "../slice/parseOffThread";
import type { Slice } from "../slice";
import {
  contextLostPlan,
  downscaleTexture,
  frameIsBlack,
  heapOverBudget,
  sceneCaps,
  windowBuildings,
  windowRoads,
} from "./sceneBudget";
import { packsRequestedAt } from "./regionPacks";

function footprint(east: number, north: number): { footprint: [number, number][] } {
  return { footprint: [[east, north], [east + 8, north], [east + 8, north + 8]] };
}

describe("scene budget", () => {
  it("keeps only nearby buildings and never more than the cap", () => {
    const buildings = Array.from({ length: 5000 }, (_, i) => footprint(i * 30, 0));
    const caps = sceneCaps(2, false);
    const kept = windowBuildings(buildings, [0, 0], caps.buildingRadius, caps.buildingCap);
    expect(kept.length).toBeLessThanOrEqual(caps.buildingCap);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(buildings.length);
    for (const b of kept) {
      const e = b.footprint[0][0];
      expect(Math.abs(e)).toBeLessThanOrEqual(caps.buildingRadius + 1);
    }
  });

  it("keeps nearby highways outside the local road window", () => {
    const caps = sceneCaps(0, true);
    const roads = [
      { highway: "motorway", points: [[800, 0], [900, 0]] as [number, number][] },
      { highway: "motorway", points: [[9000, 0], [9100, 0]] as [number, number][] },
      { highway: "residential", points: [[10, 0], [20, 0]] as [number, number][] },
      { highway: "service", points: [[8000, 0], [8010, 0]] as [number, number][] },
    ];
    const kept = windowRoads(roads, [0, 0], caps.roadRadius, caps.roadCap, caps.highwayRadius);
    expect(kept.map((r) => r.highway)).toEqual(["motorway", "residential"]);
  });

  it("caps concurrent skinned characters at 12 on high and 6 on a phone", () => {
    expect(sceneCaps(2, false).skinned).toBe(12);
    expect(sceneCaps(1, false).skinned).toBe(8);
    expect(sceneCaps(0, false).skinned).toBe(6);
    expect(sceneCaps(2, true).skinned).toBe(6);
  });

  it("downscales a 4K texture under the tier edge", () => {
    expect(downscaleTexture(4096, 2048, 0)).toEqual({ width: 256, height: 128 });
    expect(downscaleTexture(128, 64, 2)).toEqual({ width: 128, height: 64 });
  });
});

describe("soft slice parse", () => {
  it("rejects a bad file with a message instead of a partial scene", () => {
    expect(() => parseSliceText("not json")).toThrow(/not valid JSON/);
    expect(() => parseSliceText('{"roads":[]}')).toThrow(/missing required fields/);
  });

  it("reassembles a slice from worker chunks", () => {
    const slice = {
      name: "test",
      origin: { lat: 0, lon: 0 },
      buildings: [{ ...footprint(1, 2), height: 8 }, { ...footprint(3, 4), height: 8 }],
      roads: [{ highway: "residential", width: 6, name: null, points: [[0, 0], [1, 0]] as [number, number][] }],
      water: [],
      landmarks: [],
      attribution: "test",
    } as Slice;
    const acc = emptySliceAcc();
    let done: Slice | null = null;
    for (const part of chunkSlice(slice)) done = applySlicePart(acc, part);
    expect(done?.roads).toHaveLength(1);
    expect(done?.buildings).toHaveLength(2);
    expect(done?.name).toBe("test");
  });
});

describe("stress soak", () => {
  it("windows every district and stays inside the heap and mesh caps", () => {
    const caps = sceneCaps(2, false);
    let rawRoads = 0;
    let keptRoads = 0;
    for (const district of Object.values(DISTRICTS)) {
      const raw = JSON.parse(readFileSync(join(process.cwd(), "public", district.sliceFile), "utf8")) as {
        buildings: { footprint: [number, number][] }[];
        roads: { highway?: string; points: [number, number][] }[];
      };
      const buildings = windowBuildings(raw.buildings, district.center, caps.buildingRadius, caps.buildingCap);
      const roads = windowRoads(raw.roads, district.center, caps.roadRadius, caps.roadCap, caps.highwayRadius);
      rawRoads += raw.roads.length;
      keptRoads += roads.length;
      expect(buildings.length, district.id).toBeLessThanOrEqual(caps.buildingCap);
      const highways = raw.roads.filter((r) => {
        const h = r.highway ?? "";
        return h === "motorway" || h === "trunk" || h === "primary" || h.endsWith("_link");
      }).length;
      expect(roads.length, district.id).toBeLessThanOrEqual(highways + caps.roadCap);
      expect(roads.length, district.id).toBeLessThan(raw.roads.length);
      // Drive away from the spawn. Each step is a new window, still capped.
      let east = district.spawn[0];
      let north = -district.spawn[1];
      for (let step = 0; step < 4; step++) {
        const driven = windowRoads(raw.roads, [east, north], caps.roadRadius, caps.roadCap, caps.highwayRadius);
        expect(driven.length, `${district.id} step ${step}`).toBeLessThanOrEqual(highways + caps.roadCap);
        east += 120;
        north += 40;
      }
      expect(heapOverBudget(caps.heapBytes + 1, caps)).toBe(true);
      expect(heapOverBudget(caps.heapBytes, caps)).toBe(false);
    }
    // High tier, all four cities: 28,548 roads down to the window around each center.
    expect(rawRoads).toBe(28548);
    expect(keptRoads).toBeLessThan(4000);
  });

  it("treats an unlit frame and a lost context as failures", () => {
    expect(frameIsBlack(new Uint8Array(64))).toBe(true);
    const lit = new Uint8Array(64);
    lit[0] = 180; lit[1] = 180; lit[2] = 180;
    expect(frameIsBlack(lit)).toBe(false);
    expect(contextLostPlan()).toEqual({ preventDefault: true, quality: 0 });
  });

  it("does not request vegetation packs while dressing is off", () => {
    const ids = packsRequestedAt("newBedford", false).map((p) => p.id);
    expect(ids).toContain("quaternius-human");
    expect(ids).not.toContain("kenney-tree");
    expect(packsRequestedAt("newBedford", true).map((p) => p.id)).toContain("kenney-tree");
  });
});
