// §7.2.1 — Fall River lived-in: 3 buyable fronts + 3 scrimshaw, placed on
// walkable streets in the Fall River district (world = [east, -north]).
// Verifies each FR front/scrimshaw sits inside the FR district bounds, on a
// non-motorway road (within 2 m), and not inside a water ring.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BUSINESSES } from "../economy";
import { SPOTS as SCRIMSHAW_SPOTS, SCRIMSHAW_TOTAL } from "../world/Collectibles";
import { DISTRICTS } from "../districts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fr = JSON.parse(readFileSync(join(ROOT, "public/slice-fallriver.json"), "utf-8"));

function nearestRoad(e: number, n: number) {
  let best = { d: Infinity, highway: "" };
  for (const r of fr.roads) {
    for (const [re, rn] of r.points) {
      const d = Math.hypot(re - e, rn - n);
      if (d < best.d) best = { d, highway: r.highway ?? "" };
    }
  }
  return best;
}

function inWater(e: number, n: number): boolean {
  const pip = (x: number, y: number, poly: [number, number][]) => {
    let inside = false;
    let j = poly.length - 1;
    for (let i = 0; i < poly.length; i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      j = i;
    }
    return inside;
  };
  for (const w of fr.water) {
    const pts = (w as { points?: [number, number][] }).points ?? (w as [number, number][]);
    if (pts && pip(e, n, pts)) return true;
  }
  return false;
}

const FR = DISTRICTS.fallRiver.bounds!;
const inFrBounds = (x: number, z: number) =>
  x >= FR.xMin && x <= FR.xMax && z >= FR.zMin && z <= FR.zMax;

describe("§7.2.1 Fall River lived-in", () => {
  it("has exactly 3 buyable fronts in Fall River, on walkable streets", () => {
    const fronts = BUSINESSES.filter((b) => inFrBounds(b.pos[0], b.pos[2]));
    expect(fronts.map((b) => b.id).sort()).toEqual(
      ["cityhalldiner", "covechandler", "narrowscafe"].sort(),
    );
    for (const b of fronts) {
      // World [x, z] -> slice [east, north] = [x, -z].
      const road = nearestRoad(b.pos[0], -b.pos[2]);
      expect(road.d).toBeLessThan(2);
      expect(road.highway).not.toMatch(/^motorway/);
      expect(inWater(b.pos[0], -b.pos[2])).toBe(false);
      expect(b.cost).toBeGreaterThan(0);
      expect(b.perDay).toBeGreaterThan(0);
    }
  });

  it("has exactly 3 scrimshaw in Fall River, on walkable streets", () => {
    expect(SCRIMSHAW_TOTAL).toBe(11);
    const spots = SCRIMSHAW_SPOTS.filter((s) => inFrBounds(s[0], s[2]));
    expect(spots).toHaveLength(3);
    for (const s of spots) {
      const road = nearestRoad(s[0], -s[2]);
      expect(road.d).toBeLessThan(2);
      expect(road.highway).not.toMatch(/^motorway/);
      expect(inWater(s[0], -s[2])).toBe(false);
    }
  });

  it("keeps the 8 New Bedford scrimshaw exactly (no silent move)", () => {
    const nb = SCRIMSHAW_SPOTS.filter((s) => !inFrBounds(s[0], s[2]));
    expect(nb).toHaveLength(8);
  });
});
