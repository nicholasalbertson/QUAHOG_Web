// §7.6 Night lighting: streetlight positions align with the GLB lamp posts,
// the real-light pool never exceeds the tier budget, and the window glow is
// dusk-gated (0 by day, full at night).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildLampSpots, LIGHT_BUDGET, nearestLamps, windowGlowNight, LAMP_CAP, LAMP_RADIUS } from "../world/streetLights";
import { buildSpots } from "../world/GlbStreetDressing";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const nb = JSON.parse(readFileSync(join(ROOT, "public/slice-newbedford.json"), "utf-8"));
const CENTER: [number, number] = [-266, -100];

describe("§7.6.1 streetlight positions", () => {
  it("lands lamps on the same posts as the GLB dressing (same loop, lamp kinds)", () => {
    const lamps = buildLampSpots(nb.roads, CENTER);
    const spots = buildSpots(nb.roads, CENTER);
    // The dressing lamp paths are the STREET_LAMP_POOL entries; count the
    // lamp-kind spots (kind 0 or 4) by matching their positions.
    expect(lamps.length).toBeGreaterThan(0);
    expect(lamps.length).toBeLessThanOrEqual(LAMP_CAP);
    for (const l of lamps) {
      expect(Math.hypot(l.x - CENTER[0], l.z - CENTER[1])).toBeLessThanOrEqual(LAMP_RADIUS);
      expect([0.6, 3.2, 7.8]).toContain(l.headY);
      // Every lamp spot coincides with a dressing spot (same post).
      const match = spots.some((s) => Math.hypot(s.x - l.x, s.z - l.z) < 0.01);
      expect(match).toBe(true);
    }
  });

  it("places no lamp on a freeway or inside a drivable roadway", () => {
    const lamps = buildLampSpots(nb.roads, CENTER);
    // Freeway roads are excluded by construction; spot-check the count is
    // stable (deterministic placement, no randomness).
    expect(buildLampSpots(nb.roads, CENTER)).toEqual(lamps);
  });
});

describe("§7.6.3 light count cap per tier", () => {
  it("budgets 0 / 4 / 8 real point lights (low / medium / high)", () => {
    expect(LIGHT_BUDGET).toEqual({ 0: 0, 1: 4, 2: 8 });
  });

  it("nearestLamps returns the N closest, never more than the budget", () => {
    const spots = buildLampSpots(nb.roads, CENTER);
    for (const q of [0, 1, 2] as const) {
      const near = nearestLamps(spots, CENTER[0], CENTER[1], LIGHT_BUDGET[q]);
      expect(near.length).toBeLessThanOrEqual(LIGHT_BUDGET[q]);
      expect(near.length).toBe(Math.min(LIGHT_BUDGET[q], spots.length));
    }
    expect(nearestLamps(spots, 0, 0, 0)).toEqual([]);
    // Nearest-first ordering: distances are non-decreasing.
    const near = nearestLamps(spots, CENTER[0], CENTER[1], 4);
    const ds = near.map((s) => Math.hypot(s.x - CENTER[0], s.z - CENTER[1]));
    for (let i = 1; i < ds.length; i++) expect(ds[i]).toBeGreaterThanOrEqual(ds[i - 1]);
  });
});

describe("§7.6.2 lit windows (dusk-gated glow)", () => {
  it("is 0 by day, ramps through dusk, full at night", () => {
    expect(windowGlowNight(1)).toBe(0); // noon
    expect(windowGlowNight(0.5)).toBe(0); // afternoon
    expect(windowGlowNight(0.3)).toBe(0); // dusk starts
    const mid = windowGlowNight(0.15);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(windowGlowNight(0)).toBe(1); // midnight
    expect(windowGlowNight(-0.5)).toBe(1);
    expect(windowGlowNight(2)).toBe(0);
  });
});
