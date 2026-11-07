import { describe, expect, it } from "vitest";
import expSrc from "../Experience.tsx?raw";
import hpSrc from "../world/HarborProps.tsx?raw";
import wfSrc from "../world/Waterfront.tsx?raw";
import {
  DRESSING_ENABLED,
  dressingDensityScale,
  dressingEnabledForQuality,
} from "../world/dressing";

// Clutter gating: dressing returns on quality ≥ Medium with density budgets.
// JSX gates asserted at the source level via ?raw imports.

describe("harbor clutter gating", () => {
  it("legacy DRESSING_ENABLED constant stays false; quality helper owns the gate", () => {
    expect(DRESSING_ENABLED).toBe(false);
    expect(dressingEnabledForQuality(0)).toBe(false);
    expect(dressingEnabledForQuality(1)).toBe(true);
    expect(dressingEnabledForQuality(2)).toBe(true);
    expect(dressingDensityScale(0)).toBe(0.35);
    expect(dressingDensityScale(1)).toBe(0.65);
    expect(dressingDensityScale(2)).toBe(1);
  });

  it("PortClutter mount in Experience.tsx is gated by dressingOn", () => {
    const idx = (expSrc as string).indexOf("<PortClutter");
    expect(idx).toBeGreaterThan(-1);
    const window = (expSrc as string).slice(Math.max(0, idx - 200), idx);
    expect(window).toContain("dressingOn");
  });

  it("HarborProps land-side gear boxes are gated by dressingOn", () => {
    const gearMesh = (hpSrc as string).indexOf("<instancedMesh ref={gearRef}");
    expect(gearMesh).toBeGreaterThan(-1);
    const window = (hpSrc as string).slice(Math.max(0, gearMesh - 400), gearMesh);
    expect(window).toContain("dressingOn");
  });

  it("Waterfront renders no boxes (pilings + buoys only) — nothing to gate", () => {
    expect(wfSrc as string).not.toContain("boxGeometry");
  });
});
