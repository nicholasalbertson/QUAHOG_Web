import { describe, expect, it } from "vitest";
import { Rng, RngService } from "../../sim/Rng";

describe("Rng", () => {
  it("is deterministic for the same seed and stream", () => {
    const a = new Rng(42, "traffic");
    const b = new Rng(42, "traffic");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("keeps named streams independent", () => {
    const svc = new RngService(99);
    const t = svc.stream("traffic").next();
    const p = svc.stream("peds").next();
    expect(t).not.toBe(p);
    expect(svc.digest()).toContain("traffic:");
    expect(svc.digest()).toContain("peds:");
  });

  it("reseed clears streams", () => {
    const svc = new RngService(1);
    svc.stream("missions").next();
    const d1 = svc.digest();
    svc.reseed(1);
    svc.stream("missions").next();
    expect(svc.digest()).toBe(d1);
  });

  it("exposes traffic/peds/weather/missions/combat/world streams", () => {
    const svc = new RngService(7);
    for (const name of ["traffic", "peds", "weather", "missions", "combat", "world"] as const) {
      expect(svc.stream(name).next()).toBeGreaterThanOrEqual(0);
      expect(svc.stream(name).next()).toBeLessThan(1);
    }
  });
});
