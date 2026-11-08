// §9.1.1 — surface underfoot sampler.
// Pure function of (roads, position, wet): synthetic roads, no game state.
// Water needs setWaterZones; the water case is covered by isBlockedWater
// through a real water ring here.
import { describe, it, expect } from "vitest";
import type { Road } from "../slice";
import { surfaceAt } from "../world/surfaceSample";
import { setWaterZones } from "../world/waterZones";

const road = (over: Partial<Road> & { points: [number, number][] }): Road => ({
  highway: "residential",
  width: 8,
  name: null,
  ...over,
});

describe("§9.1.1 surfaceAt", () => {
  it("returns asphalt on a plain road, wetAsphalt when wet", () => {
    const roads = [road({ points: [[0, 0], [100, 0]] })];
    expect(surfaceAt(50, 0, false, roads)).toBe("asphalt");
    expect(surfaceAt(50, 0, true, roads)).toBe("wetAsphalt");
  });

  it("returns grass off the carriageway", () => {
    const roads = [road({ points: [[0, 0], [100, 0]] })];
    // Road is 8 m wide (half 4) + 1.5 m margin → 5.5 m; 20 m away is grass.
    expect(surfaceAt(50, 20, false, roads)).toBe("grass");
    expect(surfaceAt(50, -20, false, roads)).toBe("grass");
  });

  it("returns cobble for a sett surface and for Johnny Cake Hill", () => {
    const sett = [road({ points: [[0, 0], [100, 0]], surface: "sett" })];
    expect(surfaceAt(50, 0, false, sett)).toBe("cobble");
    const hill = [road({ points: [[0, 0], [100, 0]], name: "Johnny Cake Hill" })];
    expect(surfaceAt(50, 0, false, hill)).toBe("cobble");
  });

  it("returns dirt for an unpaved surface", () => {
    const dirt = [road({ points: [[0, 0], [100, 0]], surface: "dirt" })];
    expect(surfaceAt(50, 0, false, dirt)).toBe("dirt");
  });

  it("returns sidewalk roads as asphalt (concrete ~ hard surface)", () => {
    const walk = [road({ points: [[0, 0], [100, 0]], highway: "footway", surface: "concrete" })];
    expect(surfaceAt(50, 0, false, walk)).toBe("asphalt");
  });

  it("returns water inside a water ring, grass with no roads", () => {
    setWaterZones([[[0, 0], [100, 0], [100, 100], [0, 100]]], [], []);
    expect(surfaceAt(50, 50, false, [])).toBe("water");
    expect(surfaceAt(50, 50, false, null)).toBe("water");
    // Outside the ring, no roads → asphalt fallback (city default).
    expect(surfaceAt(500, 500, false, null)).toBe("asphalt");
    setWaterZones([], [], []);
  });

  it("rebuilds the index when the roads array identity changes", () => {
    const a = [road({ points: [[0, 0], [100, 0]] })];
    const b = [road({ points: [[0, 0], [100, 0]], surface: "sett" })];
    expect(surfaceAt(50, 0, false, a)).toBe("asphalt");
    expect(surfaceAt(50, 0, false, b)).toBe("cobble");
    expect(surfaceAt(50, 0, false, a)).toBe("asphalt");
  });
});
