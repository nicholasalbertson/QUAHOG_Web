// §2.5.2 compass — heading (atan2(x, z), world z = -north) to bearing/cardinal.
import { describe, it, expect } from "vitest";
import { headingToBearing, headingToCardinal, headingToCompass } from "../world/compass";

describe("§2.5.2 compass", () => {
  it("heading 0 faces south (+z), heading π faces north", () => {
    expect(headingToBearing(0)).toBeCloseTo(180, 5);
    expect(headingToCardinal(0)).toBe("S");
    expect(headingToBearing(Math.PI)).toBeCloseTo(0, 5);
    expect(headingToCardinal(Math.PI)).toBe("N");
  });

  it("heading π/2 faces east, -π/2 faces west", () => {
    expect(headingToBearing(Math.PI / 2)).toBeCloseTo(90, 5);
    expect(headingToCardinal(Math.PI / 2)).toBe("E");
    expect(headingToBearing(-Math.PI / 2)).toBeCloseTo(270, 5);
    expect(headingToCardinal(-Math.PI / 2)).toBe("W");
  });

  it("diagonals land on the intercardinal labels", () => {
    expect(headingToCardinal(Math.PI / 4)).toBe("SE");
    expect(headingToCardinal((3 * Math.PI) / 4)).toBe("NE");
    expect(headingToCardinal((-3 * Math.PI) / 4)).toBe("NW");
    expect(headingToCardinal(-Math.PI / 4)).toBe("SW");
  });

  it("bearing wraps to [0, 360)", () => {
    expect(headingToBearing(2 * Math.PI)).toBeCloseTo(180, 5);
    expect(headingToBearing(-Math.PI)).toBeCloseTo(0, 5);
    const c = headingToCompass(Math.PI / 2);
    expect(c.bearing).toBe(90);
    expect(c.cardinal).toBe("E");
  });
});
