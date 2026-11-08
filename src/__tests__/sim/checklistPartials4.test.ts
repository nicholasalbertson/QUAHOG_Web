import { describe, expect, it } from "vitest";
import { MissionRuntime } from "../../sim/MissionRuntime";
import { missionDebugSnapshot } from "../../sim/MissionDebug";
import { applySchedule, type WeatherSchedule } from "../../sim/WeatherTimeline";
import { ClockWeather } from "../../sim/ClockWeather";
import {
  detectCorruptSave,
  checksumSave,
  saveUnified,
  loadUnified,
  clearAllSaves,
  validateSave,
  SCHEMA_VERSION,
} from "../../sim/SaveGame";
import { SpatialClassRegistry } from "../../sim/SpatialClasses";
import { SAVE_KEYS } from "../../registries";
import { saveJSON } from "../../storage";

describe("checklist partials batch 4", () => {
  it("§1.3.40 mission debug snapshot", () => {
    const rt = new MissionRuntime();
    rt.start(2, 1, 30);
    const e = rt.spawn("marker", () => undefined);
    expect(e.id).toBeTruthy();
    const snap = missionDebugSnapshot(rt, [
      { id: "t1", kind: "sphere", x: 0, z: 0, r: 5, armed: true, fired: false },
    ]);
    expect(snap.phase).toBe("active");
    expect(snap.mi).toBe(2);
    expect(snap.owned).toBe(1);
    expect(snap.triggers[0]?.id).toBe("t1");
  });

  it("§14.5.3 applySchedule → ClockWeather", () => {
    const sched: WeatherSchedule = {
      day: 3,
      keys: [
        { hour: 6, weather: "fog", wetness: 0.4 },
        { hour: 12, weather: "clear", wetness: 0.1 },
        { hour: 18, weather: "rain", wetness: 0.7 },
      ],
    };
    const clock = new ClockWeather();
    applySchedule(sched, 18, clock);
    expect(clock.day).toBe(3);
    expect(clock.weather).toBe("rain");
    expect(clock.wetness).toBe(0.7);
  });

  it("§1.5.11 corrupt detection kinds", () => {
    expect(detectCorruptSave("{")).toBe("parse");
    expect(detectCorruptSave(JSON.stringify({ schemaVersion: 99 }))).toBe("schema");
    const good = JSON.stringify({ schemaVersion: SCHEMA_VERSION });
    expect(detectCorruptSave(good)).toBe("ok");
    expect(detectCorruptSave(good, "bad")).toBe("checksum");
    expect(detectCorruptSave(good, checksumSave(good))).toBe("ok");
  });

  it("§1.5.T1 fuzz 200 save round-trips", () => {
    clearAllSaves();
    for (let i = 0; i < 200; i++) {
      const cash = (i * 17) % 5000;
      const health = 1 + (i % 100);
      const police = i % 6;
      saveJSON(SAVE_KEYS.stats, { cash, health, police, faction: 0 });
      saveJSON(SAVE_KEYS.pos, { px: i, pz: -i });
      const blob = saveUnified({
        schemaVersion: SCHEMA_VERSION,
        weapons: { weapon: i % 2 ? "pistol" : "shotgun", melee: "bat", armed: i % 3 === 0 },
        waypoint: i % 5 === 0 ? { x: i, z: -i } : null,
      });
      expect(validateSave(blob)).toEqual([]);
      const loaded = loadUnified();
      expect(loaded?.stats?.cash).toBe(cash);
      expect(loaded?.weapons?.weapon).toBe(blob.weapons?.weapon);
    }
  });

  it("§1.8.3 dynamic spatial classes upsert/remove", () => {
    const reg = new SpatialClassRegistry();
    const car = { id: "c1" };
    reg.upsert("vehicle", "c1", car, 10, 20);
    expect(reg.stats().vehicle.size).toBe(1);
    reg.upsert("vehicle", "c1", car, 40, 20);
    expect(reg.stats().vehicle.size).toBe(1);
    reg.remove("c1");
    expect(reg.stats().vehicle?.size ?? 0).toBe(0);
  });
});
