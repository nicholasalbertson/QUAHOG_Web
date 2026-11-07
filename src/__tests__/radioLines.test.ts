import { describe, expect, it } from "vitest";
import { STATIONS } from "../audio/radioEngine";

describe("radio talk depth", () => {
  it("Rage and Anvil each have a deep talk bank", () => {
    const rage = STATIONS.find((s) => s.id === "rage")!;
    const anvil = STATIONS.find((s) => s.id === "anvil")!;
    expect(rage.host.lines.length).toBeGreaterThanOrEqual(55);
    expect(anvil.host.lines.length).toBeGreaterThanOrEqual(55);
    expect(rage.host.lines.some((l) => /Trash day/i.test(l))).toBe(true);
    expect(anvil.host.lines.some((l) => /Cold mornings on the barrier/i.test(l))).toBe(true);
  });
});
