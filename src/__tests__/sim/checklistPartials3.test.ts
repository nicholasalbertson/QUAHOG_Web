import { describe, expect, it } from "vitest";
import { GameLoop } from "../../sim/GameLoop";
import { FrameBudget } from "../../sim/FrameBudget";
import { EVENT_NAMES, SPAWN_KINDS, isEventName, isSpawnKind, COORDS, BRAND, SAVE_KEYS } from "../../registries";
import { MissionRuntime } from "../../sim/MissionRuntime";
import { ClockWeather, WEATHER_BLEND_SEC, windSlant } from "../../sim/ClockWeather";

describe("checklist partials batch 3", () => {
  it("§1.1.8 subscriber slots preallocated; remove is tombstone", () => {
    const loop = new GameLoop({ subCapacity: 4 });
    const uns: Array<() => void> = [];
    for (let i = 0; i < 3; i++) uns.push(loop.on("step", () => undefined));
    expect(loop.subscriberCount("step")).toBe(3);
    uns[1]();
    expect(loop.subscriberCount("step")).toBe(2);
    loop.on("step", () => undefined); // reuses hole
    expect(loop.subscriberCount("step")).toBe(3);
  });

  it("§1.1.4 FrameBudget.warn throttled 1/s + loop overrun hook", () => {
    const b = new FrameBudget();
    let now = 1000;
    expect(b.warn("t", now)).toBe(true);
    expect(b.warn("t", now + 100)).toBe(false);
    expect(b.warn("t", now + 1100)).toBe(true);
    expect(b.warnings).toBe(2);

    let hits = 0;
    const loop = new GameLoop({
      maxStepsPerFrame: 1,
      fixedDt: 1 / 60,
      onOverrun: () => {
        hits++;
        b.warn("sim.loop.overrun", 5000 + hits * 2000);
      },
    });
    loop.start();
    loop.on("step", () => undefined);
    // Huge dt forces overrun past maxStepsPerFrame.
    loop.tick(1);
    expect(loop.stats.overruns).toBeGreaterThan(0);
    expect(hits).toBe(1);
  });

  it("§0.6 / §1.3.1 event registry + spawn kinds", () => {
    expect(isEventName("mission.step.changed")).toBe(true);
    expect(isEventName("sim.weather.lightning")).toBe(true);
    expect(Object.keys(EVENT_NAMES).length).toBeGreaterThanOrEqual(12);
    expect(SPAWN_KINDS).toContain("boat");
    expect(isSpawnKind("prop")).toBe(true);
    expect(isSpawnKind("alien")).toBe(false);
    expect(COORDS.axisUp).toBe("+y");
    expect(BRAND.name).toBeTruthy();
    expect(SAVE_KEYS.weapons).toContain("weapons");
    const rt = new MissionRuntime();
    rt.start(0);
    const e = rt.spawn("ped", () => undefined);
    expect(e.kind).toBe("ped");
  });

  it("§1.4.5–6 / §1.4.9 / §1.4.14 weather blend + wind + serialize pending", () => {
    expect(WEATHER_BLEND_SEC.fog).toBeGreaterThan(1);
    const clock = new ClockWeather();
    clock.setWeather("rain");
    expect(clock.serialize().pending).toBe("rain");
    const snap = clock.serialize();
    const b = new ClockWeather();
    b.restore(snap);
    expect(b.serialize().pending).toBe("rain");
    clock.wind = { x: 2, y: 0, z: -1 };
    expect(windSlant(clock.wind, 0.5).dx).toBe(1);
    // Advance through blend to land weather.
    for (let i = 0; i < 30; i++) clock.advance(0.1);
    expect(clock.weather).toBe("rain");
  });
});
