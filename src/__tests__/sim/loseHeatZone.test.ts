import { describe, expect, it } from "vitest";
import { LOSE_HEAT_ZONES, SAFEHOUSE_POS } from "../../world/LoseHeatZone";
import { HOSPITAL, POLICE_STATION } from "../../places";

describe("LoseHeatZone specs", () => {
  it("covers safehouse, hospital, and police station radii", () => {
    const labels = LOSE_HEAT_ZONES.map((z) => z.label).sort();
    expect(labels).toEqual(["hospital", "police", "safehouse"]);
    const sh = LOSE_HEAT_ZONES.find((z) => z.label === "safehouse")!;
    expect(sh.x).toBe(SAFEHOUSE_POS[0]);
    expect(sh.z).toBe(SAFEHOUSE_POS[2]);
    expect(sh.r).toBeGreaterThan(0);
    expect(sh.rate).toBeGreaterThan(0);
    const hosp = LOSE_HEAT_ZONES.find((z) => z.label === "hospital")!;
    expect(hosp.x).toBe(HOSPITAL[0]);
    expect(hosp.z).toBe(HOSPITAL[2]);
    const pd = LOSE_HEAT_ZONES.find((z) => z.label === "police")!;
    expect(pd.x).toBe(POLICE_STATION[0]);
    expect(pd.z).toBe(POLICE_STATION[2]);
  });
});
