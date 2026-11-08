import { describe, expect, it } from "vitest";
import { buildingSeed, districtStyle } from "../world/districtStyle";
import type { Building } from "../slice";
import { exposureFor } from "../world/CinematicExposure";
import { generateArchitecturalDetails } from "../world/architecturalLayout";
import { NB_TIER1_MODELS } from "../world/nbTier1Models";
import { classifyRoadSurface } from "../world/roadSurface";

function box(name: string, h: number, cx = -200, cn = -100): Building {
  return {
    name,
    height: h,
    footprint: [
      [cx - 5, cn - 4],
      [cx + 5, cn - 4],
      [cx + 5, cn + 4],
      [cx - 5, cn + 4],
    ],
  };
}

describe("next50 visual/sim polish", () => {
  it("keeps district facade seed stable across footprint winding (#5)", () => {
    const a = box("massgis:test:1", 10);
    const b: Building = { ...a, footprint: [...a.footprint].reverse() };
    expect(buildingSeed(a)).toBe(buildingSeed(b));
    expect(districtStyle(a).kind).toBe(districtStyle(b).kind);
    expect(districtStyle(a).wall).toBe(districtStyle(b).wall);
  });

  it("bumps Whaling Museum and Double Bank interim heights (#7/#8)", () => {
    const wm = NB_TIER1_MODELS.find((m) => m.id === "whaling_museum");
    const db = NB_TIER1_MODELS.find((m) => m.id === "double_bank");
    expect(wm?.height).toBeGreaterThanOrEqual(12);
    expect(db?.height).toBeGreaterThanOrEqual(10);
  });

  it("nudges clear daylight exposure above rain (#12)", () => {
    expect(exposureFor(1, "clear")).toBeGreaterThan(exposureFor(1, "rain"));
  });

  it("raises storefront bay density vs prior every-4th gate (#4)", () => {
    const buildings = Array.from({ length: 40 }, (_, i) =>
      box(`shop-${i}`, 8 + (i % 5), -180 + i * 3, -90 + (i % 7)),
    );
    const details = generateArchitecturalDetails(buildings, 200);
    const storefronts = details.filter((d) => d.kind === "storefront");
    expect(storefronts.length).toBeGreaterThan(3);
  });

  it("still classifies Johnny Cake Hill as cobble for curb pads (#42)", () => {
    expect(
      classifyRoadSurface({
        name: "Johnny Cake Hill",
        highway: "residential",
        width: 8,
        points: [[0, 0], [10, 0]],
      }),
    ).toBe("cobble");
  });
});
