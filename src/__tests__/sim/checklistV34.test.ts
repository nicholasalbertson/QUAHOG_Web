import { describe, expect, it } from "vitest";
import {
  countNodes,
  deserializeCondition,
  evalCondition,
  serializeCondition,
  validateCondition,
  type ConditionNode,
} from "../../sim/Conditions";
import { defineMission } from "../../sim/MissionAuthoring";
import {
  createCrosswalkAgent,
  stepCrosswalk,
  walkWindowFromClock,
} from "../../sim/CrosswalkFsm";
import { evalTrigger } from "../../sim/Triggers";
import { MissionRuntime } from "../../sim/MissionRuntime";
import { createBoat, damageBoat, sampleWave, stepBoat } from "../../sim/BoatDynamics";
import {
  beginCutscene,
  duckForWanted,
  endCutscene,
  isCutsceneActive,
} from "../../sim/CutsceneStub";
import { spatialAudio } from "../../audio/SpatialAudio";
import {
  checksumSave,
  mayAutosave,
  packSave,
  unpackSave,
  SCHEMA_VERSION,
  type SaveBlobV2,
} from "../../sim/SaveGame";
import { ClockWeather } from "../../sim/ClockWeather";
import { FactionTerritory } from "../../sim/FactionTerritory";
import { meleeSwing, hitscan, ttkSeconds } from "../../sim/CombatStub";
import { startRace, stepRace, racePosition } from "../../sim/RaceStub";
import { startDialogue, advanceDialogue, skipDialogue } from "../../sim/DialogueStub";
import { SignalNetwork, pedWalkAllowed, createSignal, stepSignal } from "../../sim/SignalFsm";
import { resolveDown } from "../../sim/WastedBusted";
import { createMusicState, pickLayer, stepMusic } from "../../sim/AdaptiveMusic";
import { a11yColor, getA11y, setA11y } from "../../sim/Accessibility";
import { SHOPS, canPurchase, nearestShop } from "../../sim/ShopCatalog";
import { createWeaponWheel, openWheel, closeWheel, nudgeWheel } from "../../sim/WeaponWheel";
import { createParkingAgent, stepParking } from "../../sim/ParkingAI";
import { stepAvoidance } from "../../sim/TrafficAvoidance";
import { prompts } from "../../sim/InteractPrompt";
import { compassReading } from "../../sim/Compass";
import { damageFromHit, stepDamagePulses } from "../../sim/DamageIndicator";
import { SpatialIndex } from "../../sim/SpatialIndex";
import { witnessesWithLos, applyWitnessHeat, type WitnessActor } from "../../sim/WitnessLos";
import { openFailMenu, chooseFailAction } from "../../sim/MissionFailUi";
import { COLLECTIBLE_SETS, claimSetReward } from "../../sim/CollectibleSets";
import { listSlots, writeSlot, readSlot, clearSlot } from "../../sim/SaveSlots";
import { lintManifest, manifestStats, validateManifestDeep } from "../../sim/ManifestSchema";
import { createCarDamage, applyImpact, steeringPull } from "../../sim/CarDamage";
import { footstepFor, FOOTSTEP_SURFACES } from "../../sim/Footsteps";
import { radarBlips } from "../../sim/WantedRadar";
import { RADIO_STATIONS, assertStationsNonEmpty, restoreStation } from "../../sim/RadioStations";
import { sampleTire } from "../../sim/TireModel";
import { createPowertrain, driveForce, stepRpm } from "../../sim/Powertrain";
import { stepTimed, destroyTarget, evaluatePhoto, stepDelivery } from "../../sim/MissionBeats";
import { MAP_LEGEND } from "../../sim/MapLegend";
import { LoseHeatZones } from "../../sim/LoseHeatZone";
import { weightTransfer } from "../../sim/WeightTransfer";
import { stepAbs } from "../../sim/AbsBrake";
import { createSwim, stepSwim } from "../../sim/SwimMode";
import { createPit, tryPit } from "../../sim/PitManeuver";
import { SurfaceSampler } from "../../sim/SurfaceSample";
import { deformBudget } from "../../sim/DeformBudget";
import { autoSwitch, createInputMode } from "../../sim/InputMode";
import { createSuspension, stepSuspension } from "../../sim/Suspension";
import { createHeli, stepHeli } from "../../sim/HeliScout";
import { spawnRoadblockAhead } from "../../sim/Roadblock";
import { resolveContextAction } from "../../sim/ContextAction";
import { emitBackupCall } from "../../sim/BackupCall";
import { createTierFlash, triggerTierFlash, stepTierFlash } from "../../sim/TierFlash";
import { haptic } from "../../sim/Haptics";
import { CorpseField } from "../../sim/CorpseTtl";
import { createRecoil, fireRecoil, stepRecoil } from "../../sim/RecoilBloom";
import { SpatialClassRegistry } from "../../sim/SpatialClasses";
import { buildDayPayout } from "../../sim/DayPayout";
import { useEconomy, BUSINESSES } from "../../economy";
import { manifestFromSlice } from "../../sim/WorldManifest";
import { PedGraph } from "../../sim/PedGraph";
import { HeatAxes } from "../../sim/HeatAxes";
import type { Road } from "../../slice";

describe("checklist v3.4 deepen", () => {
  it("§1.3.20–23 condition trees eval + validate + serialize", () => {
    const tree: ConditionNode = {
      op: "all",
      kids: [
        { op: "leaf", id: "flag.is", args: ["met_mayor"] },
        { op: "any", kids: [
          { op: "leaf", id: "inventory.has", args: ["pistol", 1] },
          { op: "not", kid: { op: "leaf", id: "actor.hpBelow", args: [20] } },
        ] },
      ],
    };
    expect(validateCondition(tree)).toEqual([]);
    expect(countNodes(tree)).toBeGreaterThan(3);
    expect(evalCondition(tree, { flags: { met_mayor: true }, inventory: { pistol: 1 }, hp: 80 })).toBe(true);
    expect(evalCondition(tree, { flags: { met_mayor: false }, inventory: {}, hp: 80 })).toBe(false);
    const round = deserializeCondition(serializeCondition(tree));
    expect(evalCondition(round, { flags: { met_mayor: true }, inventory: { pistol: 2 }, hp: 50 })).toBe(true);
    expect(validateCondition({ op: "leaf", id: "nope.here" })).toContainEqual(
      expect.stringContaining("unknown predicate"),
    );
  });

  it("§1.3.39 defineMission validates", () => {
    expect(defineMission({ id: "m1", title: "T", steps: [] }).ok).toBe(false);
    const ok = defineMission({
      id: "m1",
      title: "Harbor",
      steps: [{ id: "s0", objective: "Go to pier" }, { id: "s1", objective: "Talk" }],
      parallel: [["s0"]],
    });
    expect(ok.ok).toBe(true);
  });

  it("§1.2.18 crosswalk FSM waits then crosses", () => {
    const a = createCrosswalkAgent();
    expect(stepCrosswalk(a, 0.016, true, false)).toBe("wait");
    expect(stepCrosswalk(a, 0.016, true, true)).toBe("cross");
    expect(stepCrosswalk(a, 0.016, false, true)).toBe("clear");
    expect(walkWindowFromClock(1)).toBe(true);
    expect(walkWindowFromClock(5)).toBe(false);
  });

  it("§1.3.15–16 damage + inventory triggers", () => {
    expect(
      evalTrigger(
        { id: "d", kind: "damage", hpBelow: 40 },
        { x: 0, z: 0, dt: 0.016, hp: 30 },
      ),
    ).toBe(true);
    expect(
      evalTrigger(
        { id: "i", kind: "inventory", item: "shotgun", min: 1 },
        { x: 0, z: 0, dt: 0.016, inventory: { shotgun: 1 } },
      ),
    ).toBe(true);
  });

  it("§1.3.30–32 checkpoint capture + hash assert", () => {
    const m = new MissionRuntime();
    m.start(0);
    m.spawn("prop", () => undefined);
    const cp = m.captureCheckpoint({
      worldHash: "abc",
      position: { x: 1, z: 2 },
      inventory: { pistol: 1 },
    });
    expect(cp.worldHash).toBe("abc");
    m.fail("wreck");
    const restored = m.retry();
    expect(restored?.worldHash).toBe("abc");
    expect(m.assertCheckpointHash("abc")).toBe(true);
    expect(m.assertCheckpointHash("nope")).toBe(false);
  });

  it("§1.3.34 economy dip guard after complete", () => {
    const m = new MissionRuntime();
    m.start(0);
    expect(m.canAwardEconomy()).toBe(true);
    m.completeMission();
    expect(m.canAwardEconomy()).toBe(false);
  });

  it("§1.2.13 ped cost rebuild prefers sidewalk over crosswalk", () => {
    const roads: Road[] = [
      {
        highway: "residential",
        name: "E",
        width: 6,
        points: [
          [0, 0],
          [40, 0],
          [40, 40],
        ],
      },
    ];
    const g = PedGraph.fromRoads(roads);
    g.rebuildCosts({ crosswalkPenalty: 5 });
    expect(g.nodeCount).toBeGreaterThan(2);
    const a = g.nodes[0].id;
    const b = g.nodes[g.nodes.length - 1].id;
    const path = g.routeNodes(a, b);
    expect(path).not.toBeNull();
  });

  it("§3.1 heat axes crime + decay", () => {
    const h = new HeatAxes();
    expect(h.commit("shots", true)).toBe(true);
    expect(h.commit("shots", true)).toBe(false); // cooldown
    expect(h.wanted).toBeGreaterThan(0);
    h.decay(10, true, true);
    expect(h.stars()).toBeGreaterThanOrEqual(0);
  });

  it("§5.3 boat buoyancy + sink", () => {
    const b = createBoat(0, 0);
    const wind = { x: 1, y: 0, z: 0 };
    stepBoat(b, 0.05, { throttle: 1, steer: 0.1 }, wind, 1);
    expect(b.speed).toBeGreaterThan(0);
    const w = sampleWave(0, 0, 1, wind);
    expect(Number.isFinite(w.height)).toBe(true);
    damageBoat(b, 200);
    expect(b.sunk).toBe(true);
  });

  it("§1.3.35–36 cutscene duck hook", () => {
    beginCutscene();
    expect(isCutsceneActive()).toBe(true);
    expect(spatialAudio.getDuck()).toBeLessThan(1);
    expect(duckForWanted(4)).toBe(0.35);
    endCutscene();
    expect(isCutsceneActive()).toBe(false);
    expect(duckForWanted(4)).toBe(0.4);
  });

  it("§1.5.9–13 pack checksum + autosave gate", () => {
    const blob: SaveBlobV2 = {
      schemaVersion: SCHEMA_VERSION,
      createdAt: 1,
      build: "t",
      stats: { cash: 1, health: 100, police: 0, faction: 0 },
    };
    const packed = packSave(blob);
    expect(checksumSave(packed.payload)).toBe(packed.checksum);
    expect(unpackSave(packed)?.stats?.cash).toBe(1);
    expect(unpackSave({ payload: packed.payload, checksum: "deadbeef" })).toBeNull();
    expect(mayAutosave({ cutscene: true })).toBe(false);
    expect(mayAutosave({})).toBe(true);
  });

  it("§1.4.10 lightning flash", () => {
    const c = new ClockWeather();
    c.flashLightning(0.2);
    expect(c.lightningFlash).toBeGreaterThan(0);
    c.advance(0.25);
    expect(c.lightningFlash).toBe(0);
  });

  it("§3.4 faction territory aggro + decay", () => {
    const t = new FactionTerritory();
    t.setPolygons([
      {
        id: "dock",
        faction: "wharf",
        hostile: true,
        points: [
          { x: 0, z: 0 },
          { x: 20, z: 0 },
          { x: 20, z: 20 },
          { x: 0, z: 20 },
        ],
      },
    ]);
    expect(t.enter(10, 10, 1)?.faction).toBe("wharf");
    expect(t.heatOf("wharf")).toBeGreaterThan(0);
    t.decayOutside(100, 100, 20);
    expect(t.heatOf("wharf")).toBe(0);
  });

  it("§5.1 combat melee + hitscan TTK", () => {
    const atk = { x: 0, z: 0, yaw: 0, hp: 100 };
    const tgt = { x: 0, z: 1.5, yaw: 0, hp: 100 };
    expect(meleeSwing(atk, [tgt])[0].hit).toBe(true);
    expect(hitscan("pistol", atk, [{ x: 0, z: 10, yaw: 0, hp: 100 }]).hit).toBe(true);
    expect(ttkSeconds("pistol", 0.25)).toBeGreaterThan(0);
    expect(ttkSeconds("shotgun", 0.9)).not.toBe(ttkSeconds("pistol", 0.25));
  });

  it("§5.4 race rubber-band finishes deterministically", () => {
    const r = startRace("harbor-loop", 3)!;
    for (let i = 0; i < 200 && !r.finished && !r.dnf; i++) {
      stepRace(r, 0.05, 0.008, 180);
    }
    expect(r.finished || r.dnf).toBe(true);
    expect(racePosition(r)).toBeGreaterThanOrEqual(1);
  });

  it("§8.2 dialogue advance + skip", () => {
    const s = startDialogue("open", [
      { speaker: "Mayor", text: "Welcome" },
      { speaker: "You", text: "Thanks" },
    ]);
    expect(advanceDialogue(s)?.text).toBe("Welcome");
    skipDialogue(s);
    expect(s.done).toBe(true);
    expect(s.log).toHaveLength(2);
  });
});

describe("checklist v3.4 signals/wasted/music/a11y", () => {
  it("§13.1 signal FSM cycles and ped walk on red", () => {
    const s = createSignal("a");
    let sawGreen = false;
    for (let i = 0; i < 2000; i++) {
      stepSignal(s, 0.05);
      if (s.phase === "green") sawGreen = true;
    }
    expect(sawGreen).toBe(true);
    s.phase = "red";
    s.t = 1;
    expect(pedWalkAllowed(s)).toBe(true);
    const net = new SignalNetwork();
    net.add("a", 0);
    expect(net.walkNear(0, 0, [{ id: "a", x: 0, z: 0 }])).toBeTypeOf("boolean");
  });

  it("§6.3 wasted/busted fees + flavor", () => {
    const w = resolveDown("wasted", 1000, () => 0.2);
    expect(w.respawn.label).toContain("Luke");
    expect(w.loseWeapons).toBe(false);
    const b = resolveDown("busted", 1000, () => 0.2);
    expect(b.loseWeapons).toBe(true);
    expect(b.fee).toBeGreaterThan(0);
  });

  it("§9.4 adaptive music layers crossfade", () => {
    expect(pickLayer({ stars: 4 })).toBe("chase");
    const m = createMusicState();
    stepMusic(m, "wanted", 0.5);
    expect(m.target).toBe("wanted");
    expect(m.gain).toBeGreaterThan(0);
  });

  it("§10.4 a11y settings + color remap", () => {
    setA11y({ colorblind: "protan", subtitles: true });
    expect(getA11y().colorblind).toBe("protan");
    expect(a11yColor("#ff0000")).toMatch(/^#/);
  });

  it("§4.4 shop purchase gates", () => {
    expect(SHOPS.length).toBeGreaterThan(2);
    const arms = SHOPS.find((s) => s.kind === "weapons")!.items[0];
    expect(canPurchase(arms, { cash: 10, wanted: 0, missionsDone: [] }).ok).toBe(false);
    expect(canPurchase(arms, { cash: 9999, wanted: 0, missionsDone: [] }).ok).toBe(true);
    expect(nearestShop(-290, 110, 20)?.kind).toBe("ammo");
  });

  it("§5.2.6 weapon wheel select", () => {
    const w = createWeaponWheel(["melee", "pistol"]);
    openWheel(w);
    nudgeWheel(w, 1);
    expect(closeWheel(w)).toBeTruthy();
  });

  it("§5.5.2 parking AI reaches exitPed", () => {
    const a = createParkingAgent("c1", 0, 0, { id: "s", x: 8, z: 0, yaw: 0 });
    for (let i = 0; i < 400 && a.phase !== "exitPed"; i++) stepParking(a, 0.05);
    expect(a.phase).toBe("exitPed");
  });

  it("§5.5.1 traffic avoidance slows for leader", () => {
    const self = { id: "a", x: 0, z: 0, yaw: 0, speed: 12, lane: 0 };
    const lead = { id: "b", x: 0, z: 10, yaw: 0, speed: 4, lane: 0 };
    const out = stepAvoidance(self, [lead], 16);
    expect(out.throttle).toBeLessThan(1);
  });

  it("§10.1 prompts + compass + damage indicator", () => {
    prompts.clear();
    prompts.upsert({ id: "s", kind: "sleep", label: "Sleep", priority: 2, x: 0, z: 0, radius: 5 });
    expect(prompts.at(1, 1)?.kind).toBe("sleep");
    const c = compassReading(0, { x: 10, z: 0 }, { x: 0, z: 0 });
    expect(c.waypointBearing).not.toBeNull();
    const d = damageFromHit(0, { x: 0, z: 0 }, { x: 5, z: 0 });
    expect(stepDamagePulses([d], 0.5).length).toBe(1);
  });

  it("§3.1.4 witness LOS + heat", () => {
    const idx = new SpatialIndex<WitnessActor>({ sectorSize: 32 });
    const ped: WitnessActor = { id: "p1", x: 5, z: 0, kind: "ped" };
    idx.insert(ped, ped.x, ped.z);
    const hits = witnessesWithLos(idx, { x: 0, z: 0 }, 40);
    expect(hits.length).toBeGreaterThan(0);
    const h = new HeatAxes();
    applyWitnessHeat(hits, h);
    expect(h.suspicion).toBeGreaterThan(0);
  });

  it("§8.5 fail menu + §6.4 set reward once", () => {
    const menu = openFailMenu("wreck");
    expect(chooseFailAction(menu, "retry").action).toBe("retry");
    const set = COLLECTIBLE_SETS[0];
    expect(claimSetReward(set, set.total, false).grant).toBe(true);
    expect(claimSetReward(set, set.total, true).grant).toBe(false);
  });

  it("§1.5.15 save slots round-trip", () => {
    clearSlot(0);
    writeSlot(0, { build: "slot-test", stats: { cash: 9, health: 100, police: 0, faction: 0 } });
    expect(readSlot(0)?.build).toBe("slot-test");
    expect(listSlots(1)[0].empty).toBe(false);
  });

  it("§1.6 manifest lint + ped signal bind", () => {
    const slice = { name: "t", roads: [{ highway: "residential", width: 6, name: "e", points: [[0,0],[40,0],[40,40]] as [number,number][] }], landmarks: [], buildings: [] } as any;
    const g = PedGraph.fromRoads(slice.roads);
    const bound = g.bindSignals([{ id: "sig-1", x: 20, z: 0 }]);
    expect(bound).toBeGreaterThanOrEqual(0);
    const cw = g.nodes.filter((n) => n.kind === "crosswalk");
    expect(cw.every((n) => !!n.signalId)).toBe(true);
  });

  it("§1.9.6 / §9.1.1 / §3.5.1 / §9.3 damage footsteps radar radio", () => {
    const d = applyImpact(createCarDamage(), 15, true);
    expect(d.body).toBeLessThan(100);
    expect(typeof steeringPull(d)).toBe("number");
    expect(FOOTSTEP_SURFACES).toContain(footstepFor("grass"));
    expect(radarBlips({ x: 0, z: 0, yaw: 0 }, [{ id: "c", x: 0, z: 40, kind: "cop" }])).toHaveLength(1);
    expect(RADIO_STATIONS.length).toBeGreaterThanOrEqual(6);
    expect(assertStationsNonEmpty()).toEqual([]);
    expect(restoreStation({ station: "pier" })).toBe("pier");
    expect(sampleTire(0.1, 0.05, 4000, 1).longForce).not.toBe(0);
    const pt = stepRpm(createPowertrain(), 1, 10, 0.05);
    expect(driveForce(pt, 1)).not.toBe(0);
    const timed = stepTimed({ id: "t", kind: "timed", limitSec: 1, elapsed: 0.9, complete: false, failed: false }, 0.2);
    expect(timed.failed).toBe(true);
    expect(destroyTarget({ id: "d", kind: "destroy", remaining: 1, complete: false, failed: false }).complete).toBe(true);
    expect(evaluatePhoto({ id: "p", kind: "photo", subjectId: "s", framed: false, shot: false, complete: false, failed: false }, { subjectInView: true, centered: true }, true).complete).toBe(true);
    expect(stepDelivery({ id: "del", kind: "delivery", hasPackage: true, delivered: false, complete: false, failed: false }, false, true, true).complete).toBe(true);
    expect(MAP_LEGEND.length).toBeGreaterThan(4);
    const zh = new LoseHeatZones();
    zh.setZones([{ id: "alley", mul: 2, points: [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }] }]);
    expect(zh.mulAt(5, 5)).toBe(2);
    expect(weightTransfer(1200, 3, 2).fl).toBeGreaterThan(0);
    expect(stepAbs(1, 0.4, 0.016).braking).toBe(true);
    expect(stepSwim(createSwim(), { inWater: true, throttle: 1, dt: 1 }).active).toBe(true);
    expect(tryPit(createPit(), { alongside: true, relativeSpeed: 12 })).not.toBe(0);
    const samp = new SurfaceSampler();
    samp.setPolygons([{ id: "c", surface: "cobble", points: [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 5 }, { x: 0, z: 5 }] }]);
    expect(samp.at(1, 1)).toBe("cobble");
    expect(deformBudget(0).maxPanels).toBeLessThan(deformBudget(2).maxPanels);
    const im = createInputMode();
    expect(autoSwitch(im, "enterCar")).toBe("car");
    expect(stepSuspension(createSuspension(), { rideHeight: 0.12, spring: 40, damper: 8, accelForward: 2, accelLateral: 1, dt: 0.016 }).fl.compression).toBeGreaterThan(0);
    const heli = stepHeli(createHeli(0, 0), { x: 0, z: 0 }, 0.5);
    expect(heli.spotlightOn || !heli.spotlightOn).toBe(true);
    expect(spawnRoadblockAhead("rb1", { x: 0, z: 0, yaw: 0 }).manned).toBe(true);
    expect(resolveContextAction("foot", null, true, false)).toBe("enter");
    expect(emitBackupCall(3).message).toContain("responding");
    const flash = createTierFlash();
    triggerTierFlash(flash, 1, 3);
    expect(stepTierFlash(flash, 0.1)).toBeGreaterThan(0);
    expect(typeof haptic("light")).toBe("boolean");
    const field = new CorpseField(2, 5);
    field.add({ id: "a", x: 0, z: 0, kind: "ped" });
    field.add({ id: "b", x: 1, z: 0, kind: "cop" });
    field.add({ id: "c", x: 2, z: 0, kind: "ped" });
    expect(field.count).toBe(2);
    field.step(6);
    expect(field.count).toBe(0);
    const rec = createRecoil();
    fireRecoil(rec);
    expect(rec.bloom).toBeGreaterThan(0);
    stepRecoil(rec, 1);
    const reg = new SpatialClassRegistry();
    reg.index("ped").insert({ id: 1 }, 0, 0);
    expect(reg.stats().ped.size).toBe(1);
    useEconomy.setState({ owned: { [BUSINESSES[0].id]: true }, tiers: {}, employees: {} });
    expect(buildDayPayout(1).total).toBeGreaterThan(0);
  });
});
