import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHARACTER_MODELS } from "../assets/modelRegistry";
import { REVIEW_SHOTS } from "../dev/visualReview";
import { mobileBudget } from "../mobile/profile";
import { NB_TIER1_MODELS } from "../world/nbTier1Models";
import { classifyRoadSurface } from "../world/roadSurface";

const root = join(process.cwd(), "public");

describe("visual P0/P1 audit fixes", () => {
  it("every character cast entry has a preview PNG on disk", () => {
    for (const m of CHARACTER_MODELS) {
      expect(m.preview, m.id).toBeTruthy();
      expect(existsSync(join(root, m.preview!.replace(/^\//, ""))), m.preview).toBe(true);
    }
  });

  it("raises Medium parked/ped budgets for street life near Bethel", () => {
    expect(mobileBudget(1, false).parkedCars).toBeGreaterThanOrEqual(36);
    expect(mobileBudget(1, false).pedestrians).toBeGreaterThanOrEqual(28);
  });

  it("keeps Johnny Cake Hill as cobble (sidewalk apron added in Roads)", () => {
    expect(
      classifyRoadSurface({
        highway: "residential",
        name: "Johnny Cake Hill",
        width: 7,
        points: [
          [0, 0],
          [10, 0],
        ],
      }),
    ).toBe("cobble");
  });

  it("pins Bethel review cameras on the landmark origin", () => {
    expect(REVIEW_SHOTS["bethel-front"].target[0]).toBeCloseTo(-272.23, 1);
    expect(REVIEW_SHOTS["bethel-front"].target[2]).toBeCloseTo(106.5, 1);
    expect(REVIEW_SHOTS.blizzard.weather).toBe("snow");
  });

  it("NB tier1 names are available for landmark label suppression", () => {
    expect(NB_TIER1_MODELS.some((m) => m.name === "Double Bank Building")).toBe(true);
  });
});
