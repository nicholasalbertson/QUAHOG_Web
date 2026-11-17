// §2.7 pedestrians — looks assignment + the no-adjacent-identical rule.
import { describe, it, expect } from "vitest";
import {
  assignPedLooks,
  looksIdentical,
  noAdjacentIdentical,
  PED_BUILDS,
  PED_BUILD_SCALE,
} from "../world/pedLooks";
import { EARTH_PED_COUNT } from "../earth/PlayWorld";

describe("§2.7 pedestrian looks", () => {
  it("assigns 3 distinct builds and all of them appear in a 50-ped crowd", () => {
    expect(PED_BUILDS).toHaveLength(3);
    const looks = assignPedLooks(50);
    expect(looks).toHaveLength(50);
    expect(new Set(looks.map((l) => l.build)).size).toBe(3);
  });

  it("no two adjacent peds are identical (build cycles, so this holds by construction)", () => {
    // Deterministic check across many random seeds.
    for (let seed = 0; seed < 20; seed++) {
      let s = seed * 2654435761 + 1;
      const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
      const looks = assignPedLooks(50, rand);
      expect(noAdjacentIdentical(looks)).toBe(true);
    }
    // And the helper itself catches a duplicate.
    const looks = assignPedLooks(3);
    expect(noAdjacentIdentical([looks[0], looks[0]])).toBe(false);
    expect(looksIdentical(looks[0], { ...looks[0] })).toBe(true);
    expect(looksIdentical(looks[0], { ...looks[0], shirt: "#000000" })).toBe(false);
  });

  it("earth keeps a small crowd so every city can have one", () => {
    expect(EARTH_PED_COUNT).toBeGreaterThan(0);
    expect(EARTH_PED_COUNT).toBeLessThanOrEqual(12);
  });

  it("build scales keep feet on the ground (y-scale only changes height, x/z only width)", () => {
    expect(PED_BUILD_SCALE.default).toEqual([1, 1, 1]);
    expect(PED_BUILD_SCALE.tall[1]).toBeGreaterThan(1);
    expect(PED_BUILD_SCALE.stocky[0]).toBeGreaterThan(1);
    expect(PED_BUILD_SCALE.stocky[1]).toBeLessThan(1);
  });
});
