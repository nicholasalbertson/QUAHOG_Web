import { describe, expect, it, beforeEach } from "vitest";
import { HeatAxes } from "../../sim/HeatAxes";
import { escalateHeat, deescalateHeat } from "../../sim/HeatEscalation";
import { heatChipState, heatChipLabel } from "../../sim/HeatDisplay";
import {
  startRace,
  stepRace,
  RACE_TRACKS,
  recordRaceBest,
  loadRaceBests,
  raceBestKey,
} from "../../sim/RaceStub";
import { createReload, startReload, cancelReload, interruptReload, stepReload } from "../../sim/ReloadFsm";
import {
  createPickup,
  tryCollect,
  stepPickup,
  applyPickupKind,
} from "../../sim/AmmoPickup";
import { resolveDown } from "../../sim/WastedBusted";
import { SURFACE_FRICTION, ClockWeather } from "../../sim/ClockWeather";
import { ReplayRecorder } from "../../sim/ReplayRecorder";
import { FAIL_REASONS, normalizeFailReason } from "../../sim/FailReasons";
import { MissionRuntime } from "../../sim/MissionRuntime";
import { ObjectiveNav } from "../../sim/ObjectiveNav";
import { syncNavFromStep } from "../../sim/MissionNavSync";
import { stepEscort } from "../../sim/MissionBeats";
import { mapProgressRows, COLLECTIBLE_SETS, claimSetReward } from "../../sim/CollectibleSets";
import { RADIO_STATIONS, assertStationsNonEmpty } from "../../sim/RadioStations";
import { SignalNetwork } from "../../sim/SignalFsm";
import { TrafficDirector } from "../../sim/TrafficDirector";
import { RoadGraph } from "../../sim/RoadGraph";
import { SAVE_KEYS } from "../../registries";

describe("checklist partials batch", () => {
  beforeEach(() => {
    localStorage.removeItem(SAVE_KEYS.raceBests);
  });

  it("§5.4.4 / §5.4.7 race bests persist per track×class", () => {
    expect(RACE_TRACKS).toHaveLength(3);
    for (const track of RACE_TRACKS) {
      const r = startRace(track.id, 3)!;
      for (let i = 0; i < 400 && !r.finished; i++) stepRace(r, 0.5, 0.05, track.failSec);
      expect(r.finished).toBe(true);
      expect(r.best).toBeGreaterThan(0);
    }
    const bests = loadRaceBests();
    expect(Object.keys(bests).length).toBeGreaterThanOrEqual(3);
    const key = raceBestKey("harbor-loop", "car");
    const first = bests[key];
    const again = recordRaceBest("harbor-loop", "car", first - 1);
    expect(again.improved).toBe(true);
    expect(loadRaceBests()[key]).toBe(first - 1);
  });

  it("§3.2.7–8 escalate / deescalate matrix", () => {
    const h = new HeatAxes();
    escalateHeat(h, "officer_down");
    expect(h.wanted).toBeGreaterThan(1);
    deescalateHeat(h, "bribe");
    expect(h.wanted).toBeLessThan(1);
    deescalateHeat(h, "safehouse");
    expect(h.stars()).toBe(0);
  });

  it("§3.5.5 heat chip states", () => {
    expect(heatChipState({ stars: 0, unseen: true, inLoseHeatZone: false })).toBe("clear");
    expect(heatChipState({ stars: 5, unseen: true, inLoseHeatZone: false })).toBe("apb");
    expect(heatChipState({ stars: 2, unseen: true, inLoseHeatZone: false })).toBe("decaying");
    expect(heatChipState({ stars: 2, unseen: false, inLoseHeatZone: false })).toBe("holding");
    expect(heatChipLabel("lose_heat")).toMatch(/Lose/i);
  });

  it("§5.2.2 reload FSM cancel + interrupt", () => {
    const s = createReload();
    expect(startReload(s, "pistol")).toBe(true);
    expect(stepReload(s, 0.5)).toBe(false);
    cancelReload(s);
    expect(s.phase).toBe("idle");
    startReload(s, "shotgun", 0.4);
    interruptReload(s);
    expect(s.phase).toBe("idle");
    startReload(s, "pistol", 0.2);
    expect(stepReload(s, 0.25)).toBe(true);
  });

  it("§5.2.4 / §5.2.9 ammo pickup collect + respawn + persist apply", () => {
    const p = createPickup({
      id: "a1",
      kind: "ammo_pistol",
      x: 0,
      z: 0,
      amount: 24,
      respawnSec: 1,
    });
    expect(tryCollect(p, 10, 10)).toBeNull();
    expect(tryCollect(p, 0.5, 0.5)).toBe("ammo_pistol");
    expect(p.taken).toBe(true);
    stepPickup(p, 1.1);
    expect(p.taken).toBe(false);
    const bag = { pistol: 0, shotgun: 0, add(w: "pistol" | "shotgun", n: number) {
      if (w === "pistol") this.pistol += n;
      else this.shotgun += n;
    } };
    applyPickupKind("weapon_shotgun", bag);
    expect(bag.shotgun).toBe(6);
  });

  it("§6.3.4 wasted keeps weapons; busted confiscates; fees clamp", () => {
    const w = resolveDown("wasted", 50, () => 0.9);
    expect(w.loseWeapons).toBe(false);
    expect(w.fee).toBeLessThanOrEqual(50);
    expect(w.respawn.label).toMatch(/Luke/);
    const b = resolveDown("busted", 40, () => 0.9);
    expect(b.loseWeapons).toBe(true);
    expect(b.fee).toBeLessThanOrEqual(40);
    expect(b.respawn.label).toMatch(/Station/);
  });

  it("§1.9.3 SURFACE_FRICTION + wet/snow deltas", () => {
    expect(SURFACE_FRICTION.asphalt).toBe(1);
    expect(SURFACE_FRICTION.wetAsphalt).toBeLessThan(1);
    const clock = new ClockWeather();
    clock.setWeather("clear", 0);
    const dry = clock.friction("asphalt");
    clock.setWeather("rain", 0);
    clock.wetness = 0.8;
    expect(clock.friction("asphalt")).toBeLessThan(dry);
    clock.setWeather("snow", 0);
    expect(clock.friction("asphalt")).toBeLessThan(dry);
  });

  it("§0.3 10k-step replay digest identical twice", () => {
    const run = () => {
      const rec = new ReplayRecorder();
      rec.startRecord(0xc0ffee);
      for (let i = 0; i < 10_000; i++) {
        rec.recordStep({ steer: Math.sin(i * 0.01), throttle: (i % 7) / 7, bits: i & 3 });
      }
      return rec.digest();
    };
    expect(run()).toBe(run());
  });

  it("§1.3.29 fail reasons normalize", () => {
    for (const r of FAIL_REASONS) expect(normalizeFailReason(r)).toBe(r);
    const rt = new MissionRuntime();
    rt.start(0, 0, 0.01);
    rt.advance(0.02, []);
    expect(rt.phase).toBe("failed");
    expect(rt.failReason).toMatch(/Time/i);
  });

  it("§1.3.27 / §8.1.2 syncNavFromStep sets goal", () => {
    const nav = new ObjectiveNav();
    nav.setGraph(
      RoadGraph.fromRoads(
        [{ highway: "residential", width: 8, name: "E", points: [[0, 0], [40, 0], [80, 0]] }],
        { quantize: 4 },
      ),
    );
    syncNavFromStep(nav, { target: [40, 0, 0] }); // world z=0 ← OSM n=0
    const g = nav.update({ x: 0, z: 0 }, 0, 5);
    expect(g.distanceRemaining).toBeGreaterThan(10);
    syncNavFromStep(nav, null);
    expect(nav.update({ x: 0, z: 0 }, 0, 0).distanceRemaining).toBe(0);
  });

  it("§8.3.6 escort completes on arrival; fails on sep/hp", () => {
    const ok = stepEscort(
      { id: "e", kind: "escort", complete: false, failed: false, targetHp: 100, maxSep: 30, sep: 0 },
      80,
      5,
      true,
    );
    expect(ok.complete).toBe(true);
    const dead = stepEscort(
      { id: "e2", kind: "escort", complete: false, failed: false, targetHp: 100, maxSep: 30, sep: 0 },
      0,
      5,
      false,
    );
    expect(dead.failed).toBe(true);
  });

  it("§6.4.2–3 map progress + set reward unlock", () => {
    const rows = mapProgressRows({ scrimshaw: 8 });
    expect(rows[0].found).toBe(8);
    expect(rows[0].rewardLabel).toMatch(/scrimshaw-boat|1500/);
    const claim = claimSetReward(COLLECTIBLE_SETS[0], 8, false);
    expect(claim.grant).toBe(true);
    expect(claim.unlock).toBe("scrimshaw-boat");
  });

  it("§9.3 Rage/Anvil stations non-empty from radioEngine", () => {
    expect(assertStationsNonEmpty()).toEqual([]);
    const rage = RADIO_STATIONS.find((s) => s.id === "rage");
    const anvil = RADIO_STATIONS.find((s) => s.id === "anvil");
    expect(rage?.tracks.length).toBeGreaterThan(10);
    expect(anvil?.tracks.length).toBeGreaterThan(10);
  });

  it("§5.5.4 traffic holds near ped walk (red) window", () => {
    const g = RoadGraph.fromRoads(
      [
        { highway: "residential", width: 8, name: "E", points: [[0, 0], [100, 0], [200, 0]] },
        { highway: "residential", width: 8, name: "N", points: [[100, 0], [100, 100]] },
      ],
      { quantize: 4 },
    );
    const signals = new SignalNetwork();
    const sig = signals.add("s0", 0);
    // Force ped-walk window: red with mid timer.
    sig.phase = "red";
    sig.t = 2;
    const dir = new TrafficDirector(g, {
      speed: 20,
      signals,
      signalPositions: [{ id: "s0", x: 0, z: 0 }],
      spawnMin: 5,
      spawnMax: 80,
    });
    const agents = dir.spawnFleet(1, { x: 0, z: 0 });
    expect(agents.length).toBeGreaterThan(0);
    const a = agents[0];
    a.x = 0;
    a.z = 0;
    a.stop = 0;
    dir.update(0.1, { x: 0, z: 0 }, 50, agents);
    expect(a.stop).toBeGreaterThan(0);
  });
});
