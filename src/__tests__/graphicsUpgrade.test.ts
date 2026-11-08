import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { POLYHAVEN } from "../world/vendorCatalog";

describe("graphics upgrade sprint", () => {
  it("wires Poly Haven asphalt normal + roughness into the catalog", () => {
    expect(POLYHAVEN.asphaltNor).toMatch(/nor/);
    expect(POLYHAVEN.asphaltRough).toMatch(/Rough|rough/);
    expect(POLYHAVEN.cobbleNor).toMatch(/nor/);
  });

  it("Effects bloom threshold is low enough to catch night windows", () => {
    const src = readFileSync(new URL("../world/Effects.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/luminanceThreshold=\{0\.8/);
    expect(src).not.toMatch(/luminanceThreshold=\{1\.1\}/);
  });

  it("StreetLights mount without requiring city-wide dressing", () => {
    const src = readFileSync(new URL("../Experience.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/\{slice && <StreetLights/);
    expect(src).toMatch(/ContactGroundShadows/);
    expect(src).not.toMatch(/DRESSING_ENABLED && slice && <StreetLights/);
  });

  it("facade window UV densifies below the old 3.2 m storey", () => {
    const style = readFileSync(new URL("../world/districtStyle.ts", import.meta.url), "utf8");
    expect(style).toMatch(/\/ 2\.7/);
    const stream = readFileSync(new URL("../world/StreamingBuildings.tsx", import.meta.url), "utf8");
    expect(stream).toMatch(/FLOOR = 2\.7/);
  });
});
