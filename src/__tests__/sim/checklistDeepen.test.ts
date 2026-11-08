import { describe, expect, it } from "vitest";
import { OccupancyGrid } from "../../sim/OccupancyGrid";
import { evalTrigger, rearm, type Trigger } from "../../sim/Triggers";
import { MissionRuntime } from "../../sim/MissionRuntime";
import { ClockWeather } from "../../sim/ClockWeather";
import { refuseFutureSave, validateSave, SCHEMA_VERSION } from "../../sim/SaveGame";
import { rng } from "../../sim/Rng";

describe("checklist deepen §1.2–§1.5 / §1.3 triggers", () => {
  it("§1.2.15 occupancy decays and samples neighbors", () => {
    const g = new OccupancyGrid(4);
    g.insert(0, 0);
    g.insert(4, 0);
    expect(g.countAt(0, 0)).toBeGreaterThan(0);
    const nb = g.sampleNeighbors(0, 0, 1);
    expect(nb.n).toBeGreaterThan(0);
    g.decay(0.1);
    expect(g.countAt(0, 0)).toBeLessThan(1);
  });

  it("§1.3 triggers fire-once and rearm", () => {
    const t: Trigger = { id: "zone", kind: "sphere", x: 0, z: 0, r: 5, fireOnce: true };
    expect(evalTrigger(t, { x: 1, z: 1, dt: 0.016 })).toBe(true);
    expect(evalTrigger(t, { x: 1, z: 1, dt: 0.016 })).toBe(false);
    rearm(t);
    expect(evalTrigger(t, { x: 1, z: 1, dt: 0.016 })).toBe(true);
  });

  it("§1.3.11 mission spawn uses missions RNG stream", () => {
    rng.reseed(7);
    const m = new MissionRuntime();
    m.start(0);
    const a = m.spawn("prop", () => undefined);
    const b = m.spawn("prop", () => undefined);
    expect(a.id).not.toBe(b.id);
    expect(m.ownedCount).toBe(2);
    m.completeMission();
    expect(m.ownedCount).toBe(0);
  });

  it("§1.3.17 timer trigger fires after duration", () => {
    const m = new MissionRuntime();
    m.start(0);
    m.addTrigger({ id: "t", kind: "timer", duration: 0.05 });
    const fired: string[] = [];
    m.on("mission.trigger", (e) => fired.push(String((e.payload as { id: string }).id)));
    m.advance(0.02, [], { x: 0, z: 0 });
    expect(fired).toEqual([]);
    m.advance(0.04, [], { x: 0, z: 0 });
    expect(fired).toEqual(["t"]);
  });

  it("§1.4.15 weather roll is deterministic per seed", () => {
    rng.reseed(123);
    const a = new ClockWeather();
    const w1 = a.rollWeather(0);
    rng.reseed(123);
    const b = new ClockWeather();
    const w2 = b.rollWeather(0);
    expect(w1).toBe(w2);
    expect(a.telemetrySample().weather).toBe(w1);
  });

  it("§1.5.8 refuses future schema versions", () => {
    const bad = { schemaVersion: SCHEMA_VERSION + 1, createdAt: 1, build: "x" };
    expect(validateSave(bad).some((e) => e.includes("future"))).toBe(true);
    expect(refuseFutureSave(bad).ok).toBe(false);
  });
});
