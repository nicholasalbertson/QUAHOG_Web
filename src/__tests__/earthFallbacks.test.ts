// §2.10 earth fallbacks — the fallback-ground predicate + PackGLB fallback.
import { describe, it, expect } from "vitest";
import { shouldShowFallbackGround, FALLBACK_GROUND_SIZE, earthFallbackNotice } from "../earth/fallbacks";
import { fallbackNotice } from "../sim/FallbackGround";
import type { TileFault } from "../earth/tileFault";

describe("§2.10 earth fallbacks", () => {
  it("shows the fallback ground when the tiles fail (fault or tiles-missing)", () => {
    expect(shouldShowFallbackGround({ fault: true, tilesProblem: false })).toBe(true);
    expect(shouldShowFallbackGround({ fault: false, tilesProblem: true })).toBe(true);
    expect(shouldShowFallbackGround({ fault: true, tilesProblem: true })).toBe(true);
    expect(shouldShowFallbackGround({ fault: false, tilesProblem: false })).toBe(false);
  });

  it("the fallback ground covers the play area", () => {
    expect(FALLBACK_GROUND_SIZE).toBeGreaterThanOrEqual(2000);
  });

  it("§2.10.4 forced 5xx / missing tiles surface fallbackNotice", () => {
    const five: TileFault = { kind: "unavailable", status: 500, summary: "err", detail: "" };
    expect(earthFallbackNotice(five, false)).toBe(fallbackNotice("tile-500"));
    expect(earthFallbackNotice(null, true)).toMatch(/fallback|Network/i);
    expect(earthFallbackNotice(null, false)).toBeNull();
  });

  it("PackGLB renders a fallback vehicle on load failure (not nothing)", async () => {
    // Source-level check: the fallback exists and is wired to the failure path.
    // (A full render test needs a canvas + a failing GLB URL.)
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../actors/PackGLB.tsx", import.meta.url), "utf-8"),
    );
    expect(src).toContain("function FallbackVehicle");
    expect(src).toContain("setFailed(true)");
    expect(src).toContain("return failed ? <FallbackVehicle /> : null");
  });
});
