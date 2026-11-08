import { describe, expect, it } from "vitest";
import { REVIEW_SHOTS } from "../dev/visualReview";

describe("visualReview shots", () => {
  it("pins blizzard weather to snow", () => {
    expect(REVIEW_SHOTS.blizzard.weather).toBe("snow");
    expect(REVIEW_SHOTS["bethel-front"].weather).toBe("clear");
  });

  it("keeps five stable Johnny Cake Hill cameras", () => {
    expect(Object.keys(REVIEW_SHOTS).sort()).toEqual([
      "bethel-front",
      "bethel-side",
      "blizzard",
      "mariners-home",
      "water-street",
    ]);
  });
});
