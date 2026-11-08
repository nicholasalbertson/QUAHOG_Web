// §2.9.1 day/night sun position — follows the sim clock's hour.
import { describe, it, expect } from "vitest";
import { sunPositionForHour, sunDayFactor } from "../earth/dayNight";

describe("§2.9.1 sun position", () => {
  it("rises east at 06:00, overhead at noon, sets west at 18:00", () => {
    const dawn = sunPositionForHour(6);
    expect(dawn[0]).toBeGreaterThan(90); // east (+x)
    expect(Math.abs(dawn[1])).toBeLessThan(1); // on the horizon
    expect(Math.abs(dawn[2])).toBeLessThan(1);
    const noon = sunPositionForHour(12);
    expect(noon[1]).toBeGreaterThan(90); // overhead (+y)
    expect(Math.abs(noon[0])).toBeLessThan(1);
    expect(Math.abs(noon[2])).toBeLessThan(1);
    const dusk = sunPositionForHour(18);
    expect(dusk[0]).toBeLessThan(-90); // west (-x)
    expect(Math.abs(dusk[1])).toBeLessThan(1);
  });

  it("is below the horizon at midnight", () => {
    const midnight = sunPositionForHour(0);
    expect(midnight[1]).toBeLessThan(-90);
  });

  it("has unit direction (length 100) at every hour", () => {
    for (let h = 0; h < 24; h++) {
      const [x, y, z] = sunPositionForHour(h);
      expect(Math.hypot(x, y, z)).toBeCloseTo(100, 5);
    }
  });

  it("day factor is 1 at noon, 0 at night", () => {
    expect(sunDayFactor(12)).toBeCloseTo(1, 5);
    expect(sunDayFactor(0)).toBe(0);
    expect(sunDayFactor(6)).toBeCloseTo(0, 5);
    expect(sunDayFactor(18)).toBeCloseTo(0, 5);
    expect(sunDayFactor(9)).toBeGreaterThan(0.5);
  });
});
