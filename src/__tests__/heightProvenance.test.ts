import { describe, expect, it } from "vitest";
import {
  BROCKTON_HEIGHT_SOURCE,
  isBrocktonTileKey,
  tagBrocktonTileBuildings,
  tagEstimatedHeights,
  tileKeyWorldSample,
} from "../world/heightProvenance";
import type { Building } from "../slice";

const b = (over: Partial<Building> = {}): Building => ({
  footprint: [[0, 0], [1, 0], [1, 1]],
  height: 8,
  ...over,
});

describe("Brockton height provenance (§7.3 3DEP gap)", () => {
  it("maps Cappiello tile key into Brockton", () => {
    expect(isBrocktonTileKey("-17_99")).toBe(true);
    const w = tileKeyWorldSample("-17_99");
    expect(w.x).toBeCloseTo(-8250, 0);
    expect(w.z).toBeCloseTo(-49750, 0);
  });

  it("does not tag New Bedford core tiles as Brockton", () => {
    expect(isBrocktonTileKey("0_0")).toBe(false);
    expect(isBrocktonTileKey("-1_-1")).toBe(false);
  });

  it("stamps missing heightSource on Brockton loads only", () => {
    const raw = [b(), b({ heightSource: "lidar" })];
    const tagged = tagBrocktonTileBuildings("-17_99", raw);
    expect(tagged[0].heightSource).toBe(BROCKTON_HEIGHT_SOURCE);
    expect(tagged[1].heightSource).toBe("lidar");
    expect(tagBrocktonTileBuildings("0_0", raw)).toBe(raw);
  });

  it("tagEstimatedHeights is a no-op when every row already has a source", () => {
    const rows = [b({ heightSource: "measured" })];
    expect(tagEstimatedHeights(rows, BROCKTON_HEIGHT_SOURCE)).toBe(rows);
  });
});
