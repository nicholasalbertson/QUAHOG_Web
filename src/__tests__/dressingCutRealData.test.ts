import { describe, expect, it } from "vitest";
import sliceRaw from "../../public/slice-newbedford.json?raw";
import type { Road } from "../slice";
import { buildRoadIndex, junctionPoints } from "../world/placement";
import { computeLampPositions } from "../world/Props";
import { buildStreetExtrasLayout } from "../world/StreetExtras";
import { buildHighMastPositions } from "../world/HighMasts";
import { computeTrafficLightPositions } from "../world/TrafficLights";

// Dressing cut (2026-11-07): runs the ACTUAL patched builders against the
// real NB slice (b6a9f9c data) and asserts the cut's two invariants —
// fewer items than before, and NONE inside a drivable street. Before
// counts (measured 2026-11-07, same data): Props 499 (lamps 167),
// StreetExtras 252, HighMasts 3 (2 in-roadway), TrafficLights 17 (17/17
// in-roadway, at way-split points, not junctions).
const slice = JSON.parse(sliceRaw) as { roads: Road[] };
const CENTER: [number, number] = [-266, 100];
const roads = slice.roads;

describe("dressing cut — real NB slice", () => {
  it("Props lamps: fewer than before, none in a drivable street", () => {
    const lamps = computeLampPositions(roads, CENTER);
    const idx = buildRoadIndex(roads);
    expect(lamps.length).toBeLessThan(167);
    expect(lamps.length).toBeGreaterThan(0);
    for (const p of lamps) expect(idx.inDrivableRoadway(p.x, p.z)).toBe(false);
  });
  it("StreetExtras: fewer than before, none in a drivable street", () => {
    const L = buildStreetExtrasLayout(roads, CENTER);
    const total = L.stops.length + L.meters.length + L.cans.length + L.cones.length
      + L.booths.length + L.papers.length + L.bollards.length;
    const idx = buildRoadIndex(roads);
    expect(total).toBeLessThan(252);
    expect(total).toBeGreaterThan(0);
    for (const ps of [L.stops, L.meters, L.cans, L.cones, L.booths, L.papers, L.bollards]) {
      for (const p of ps) expect(idx.inDrivableRoadway(p.x, p.z)).toBe(false);
    }
  });
  it("HighMasts: none in a drivable street (was 2 of 3 on the opposite carriageway)", () => {
    const masts = buildHighMastPositions(roads, CENTER);
    const idx = buildRoadIndex(roads);
    for (const p of masts) expect(idx.inDrivableRoadway(p.x, p.z)).toBe(false);
  });
  it("TrafficLights: at real junctions only, on corners, none in a roadway", () => {
    const spots = computeTrafficLightPositions(roads, CENTER);
    const idx = buildRoadIndex(roads);
    const junctions = junctionPoints(roads);
    expect(spots.length).toBeLessThanOrEqual(16);
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) {
      expect(idx.inDrivableRoadway(s.x, s.z)).toBe(false);
      const nearJunction = junctions.some((j) => Math.hypot(j.x - s.x, j.z - s.z) < 15);
      expect(nearJunction).toBe(true);
    }
  });
});
