import { describe, expect, it } from "vitest";
import type { Road } from "../slice";
import { makeDirtTexture, makeAsphaltTexture, makeCobbleTexture } from "../world/textures";
import { buildHarborBankPieces } from "../world/HarborBanks";
import { buildEmbankmentPieces } from "../world/Embankment";

describe("visual surface helpers", () => {
  it("exports makeDirtTexture alongside the other road-surface makers", () => {
    expect(typeof makeDirtTexture).toBe("function");
    expect(typeof makeAsphaltTexture).toBe("function");
    expect(typeof makeCobbleTexture).toBe("function");
  });

  it("places capped riprap + grass along a water ring near the center", () => {
    // Square water polygon around origin (slice [east, north]).
    const ring: [number, number][] = [
      [-40, -40], [40, -40], [40, 40], [-40, 40], [-40, -40],
    ];
    const { rocks, grass } = buildHarborBankPieces([ring], [0, 0]);
    expect(rocks.length).toBeGreaterThan(10);
    expect(rocks.length).toBeLessThanOrEqual(900);
    expect(grass.length).toBeGreaterThan(0);
    expect(grass.length).toBeLessThanOrEqual(450);
    // Rocks sit in the ~0.1–0.55 band (sloping toward water from ~0.5).
    for (const r of rocks) {
      expect(r.y).toBeGreaterThan(0.05);
      expect(r.y).toBeLessThan(0.7);
    }
  });

  it("builds berm pieces on both sides of a motorway via the freeway corridor", () => {
    const motorway: Road = {
      highway: "motorway",
      name: "John F Kennedy Memorial Hwy",
      points: [[-100, 0], [100, 0]],
      width: 16,
    };
    const pieces = buildEmbankmentPieces([motorway]);
    expect(pieces.length).toBe(2); // one segment × both shoulders
    for (const p of pieces) {
      expect(Math.abs(p.z)).toBeCloseTo(11, 5);
      expect(p.len).toBeCloseTo(200, 5);
    }
    expect(buildEmbankmentPieces([])).toEqual([]);
  });
});
