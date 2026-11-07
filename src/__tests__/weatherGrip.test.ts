import { describe, expect, it } from "vitest";
import { ClockWeather } from "../sim/ClockWeather";
import { snowVehicleLimits, weatherVehicleLimits } from "../weather/snowstorm";

describe("weatherVehicleLimits (§1.4 → car)", () => {
  it("dry asphalt matches full arcade limits", () => {
    const c = new ClockWeather();
    c.setWeather("clear", 0);
    c.wetness = 0;
    const t = weatherVehicleLimits(c.friction("asphalt"), 32, 12);
    expect(t.forward).toBeCloseTo(32, 5);
    expect(t.reverse).toBeCloseTo(12, 5);
    expect(t.steer).toBeCloseTo(1, 5);
  });

  it("wet roads cut forward speed ≥ 20% vs dry", () => {
    const dry = new ClockWeather();
    dry.setWeather("clear", 0);
    dry.wetness = 0;
    const wet = new ClockWeather();
    wet.setWeather("rain", 0);
    wet.wetness = 1;
    const a = weatherVehicleLimits(dry.friction("asphalt"), 32, 12);
    const b = weatherVehicleLimits(wet.friction("asphalt"), 32, 12);
    expect(b.forward).toBeLessThanOrEqual(a.forward * 0.8);
  });

  it("snow grip is below dry and near the old snowVehicleLimits band", () => {
    const snow = new ClockWeather();
    snow.setWeather("snow", 0);
    snow.wetness = 0; // isolate snow multiplier (wet asphalt stacks separately)
    const t = weatherVehicleLimits(snow.friction("asphalt"), 32, 12);
    const legacy = snowVehicleLimits(true, 32, 12);
    expect(t.forward).toBeLessThan(32);
    // Friction snow (~0.7) sits near the legacy 0.64 band (±20%).
    expect(t.forward).toBeGreaterThan(legacy.forward * 0.8);
    expect(t.forward).toBeLessThan(legacy.forward * 1.25);
  });
});

describe("ClockWeather.streamRadiusScale (§1.4.13)", () => {
  it("shortens the ring in fog more than rain, clear is 1", () => {
    const c = new ClockWeather();
    c.setWeather("clear", 0);
    expect(c.streamRadiusScale()).toBe(1);
    c.setWeather("rain", 0);
    expect(c.streamRadiusScale()).toBe(0.9);
    c.setWeather("fog", 0);
    expect(c.streamRadiusScale()).toBe(0.7);
    c.setWeather("snow", 0);
    expect(c.streamRadiusScale()).toBe(0.85);
  });
});
