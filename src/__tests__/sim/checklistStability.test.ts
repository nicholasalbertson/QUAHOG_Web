import { describe, expect, it, vi } from "vitest";
import { RaycastThrottle } from "../../sim/RaycastThrottle";
import { borrow2, set2, next3 } from "../../sim/VecPool";
import { DepthGuard, walkLimited } from "../../sim/MaxDepth";
import { FetchCircuit } from "../../sim/FetchRetry";
import { WebGlContextLoss } from "../../sim/WebGlContextLoss";
import { IdleDetect } from "../../sim/IdleDetect";
import { authOverlayFor } from "../../sim/AuthOverlayCopy";
import { readMemory, requestHeapSnapshotLabel } from "../../sim/PerfMemory";
import { FrameBudget } from "../../sim/FrameBudget";
import { sanitizeNumber, sanitizeVec3, isFinitePose } from "../../sim/NanGuard";
import { triggerDebugRows } from "../../sim/TriggerDebug";
import { migrateManifest, MANIFEST_CURRENT_VERSION } from "../../sim/ManifestMigrate";
import { lintManifest, validateManifestDeep } from "../../sim/ManifestSchema";
import { graphsFromManifest } from "../../sim/ManifestGraphs";
import { hotReloadManifest } from "../../sim/ManifestHotReload";
import { tilesFromManifest } from "../../sim/StreamerTiles";
import { clampAccumulator } from "../../sim/ResumeFastPath";
import { driveShared } from "../../sim/SharedDriver";
import type { WorldManifest } from "../../sim/WorldManifest";
import { evalTrigger } from "../../sim/Triggers";
import { actionsFor, assertNoDeadZones } from "../../sim/InputActionSets";
import {
  loadTouchLayout,
  saveTouchLayout,
  resetTouchLayout,
  moveWidget,
  resizeWidget,
} from "../../sim/TouchLayout";
import { LEGACY_V1_FIXTURES, migrateLegacyFixture } from "../../sim/SaveMigrationFixtures";
import { atomicWrite, atomicRecover } from "../../sim/AtomicSave";
import { SCHEMA_VERSION } from "../../sim/SaveGame";
import { shootWithWitnesses, hideDecay } from "../../sim/HeatWitnessFlow";
import { HeatAxes } from "../../sim/HeatAxes";
import { SpatialIndex } from "../../sim/SpatialIndex";
import type { WitnessActor } from "../../sim/WitnessLos";
import { createFootCop, beginChase, stepFootCop } from "../../sim/FootCops";
import { responseForWanted, responseReady } from "../../sim/TierResponse";
import { raceHudModel } from "../../sim/RaceHud";
import { startRace } from "../../sim/RaceStub";
import { createWeaponSwitch, requestSwitch, stepWeaponSwitch } from "../../sim/WeaponSwitch";
import { ownershipSignage } from "../../sim/OwnershipSignage";
import { MapFog } from "../../sim/MapFog";
import { blipsFromManifest } from "../../sim/MapBlips";
import { createTutorial, advanceTutorial, skipTutorial, tutorialCopy } from "../../sim/TutorialFlow";
import { loadBuses, setBus, effectiveGain, saveBuses } from "../../sim/AudioBuses";
import { createLoco, stepLoco } from "../../sim/LocomotionBlend";
import { BOAT_CATALOG } from "../../sim/BoatCatalog";
import { createCoverState, nearestCover, enterCover } from "../../sim/CoverSystem";
import { SAFEHOUSES, canUnlock, unlockedSafehouses } from "../../sim/SafehouseUnlocks";
import { FALLBACK_GROUND, fallbackNotice } from "../../sim/FallbackGround";
import { ownershipRows } from "../../sim/OwnershipUi";
import { CorpseField } from "../../sim/CorpseTtl";
import { INTERIORS, enterInterior, createInteriorSession } from "../../sim/InteriorScenes";
import { createWardrobe, buyOutfit, equipOutfit } from "../../sim/Wardrobe";
import { startTrack, stepTrack, skipTrack, sampleCamera } from "../../sim/CutsceneTracks";
import { worldArrow } from "../../sim/WorldArrow";
import { inMissionRange } from "../../sim/MissionDistance";
import { assertSfxCatalog, impactSfx, WEAPON_SFX } from "../../sim/SfxCatalog";
import { createDeferredMusic, loadMusicDeferred } from "../../sim/DeferredMusic";
import { corruptSavePrompt, applyCorruptAction } from "../../sim/CorruptSaveUi";
import { createGloria, startGloria } from "../../sim/GloriaSurge";
import { projectedFirstUpgradeMin, meetsFirstUpgradeGate } from "../../sim/EconomyBalance";
import { createSwim, stepSwim } from "../../sim/SwimMode";
import { deliverNarrative } from "../../sim/VoSilent";
import { applyNewGame, DEFAULT_NEW_GAME } from "../../sim/NewGamePolicy";
import { impostorsForTiles } from "../../sim/TileImpostor";
import { disposeObject3D } from "../../sim/MeshDispose";
import { loadKeyMap, remap, saveKeyMap, bindingFor } from "../../sim/KeyRemap";
import { presetOf, saveGraphicsPreset, loadGraphicsPreset } from "../../sim/GraphicsPreset";
import { sirenPan } from "../../sim/SirenPan";
import { routeLineFromPath, routeLength } from "../../sim/RouteLine";
import { labelFor } from "../../sim/A11yLabels";
import { createFog, setFogEnabled, visibilityOf } from "../../sim/FogVisibility";
import { createMissionEntities, allFlowsExercised } from "../../sim/MissionEntityFlows";
import { fireOnceReplay } from "../../sim/TriggerReplayOnce";
import { MAP_LEGEND } from "../../sim/MapLegend";
import { createLightBudget, tryAddLight } from "../../sim/LightBudget";
import { lodLevel, lodFade } from "../../sim/LodFade";
import { resolveVehicleModel } from "../../sim/FallbackVehicle";
import { factionResponse, hostileEntryEscalate } from "../../sim/FactionNpc";
import { loadLang, saveLang } from "../../sim/LanguageSelect";
import { missingHudSources } from "../../sim/HudDataSources";
import { brandConflicts, CANONICAL_BRAND } from "../../sim/BrandAudit";
import { FISH_PIER_OPENING } from "../../sim/OpeningSetPiece";
import { waterReflectionForQuality } from "../../sim/WaterReflectionTier";
import { headlightBudget, useSpotlight } from "../../sim/HeadlightBudget";
import { swapSlots, safeLoadSlot } from "../../sim/SaveSlotSwap";

function sampleManifest(): WorldManifest {
  return {
    version: 1,
    name: "test",
    zones: [{ id: "core", name: "core", bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 } }],
    roads: [
      {
        highway: "residential",
        name: "A",
        width: 6,
        points: [
          [0, 0],
          [40, 0],
        ],
      },
    ],
    landmarks: [],
    markers: [{ id: "m0", kind: "poi", x: 10, z: 10 }],
    spawns: [{ id: "p0", kind: "player", x: 0, z: 0 }],
    doors: [{ id: "d0", x: 5, z: 5 }],
    signals: [{ id: "s0", x: 1, z: 1 }],
    raceTracks: [{ id: "r0", name: "loop", checkpoints: 2 }],
    collectibles: [{ id: "c0", kind: "scrimshaw", x: 20, z: 20 }],
    fronts: [{ id: "f0", name: "Shop", x: 30, z: 30, cost: 100 }],
    territories: [],
  };
}

describe("checklist stability + manifest deepen", () => {
  it("§2.1.1 raycast throttle priority + cap", () => {
    const t = new RaycastThrottle(2);
    const order: string[] = [];
    t.beginFrame();
    t.enqueue({ id: "lo", priority: 1, run: () => order.push("lo") });
    t.enqueue({ id: "hi", priority: 9, run: () => order.push("hi") });
    t.enqueue({ id: "mid", priority: 5, run: () => order.push("mid") });
    expect(t.flush()).toBe(2);
    expect(order).toEqual(["hi", "mid"]);
    expect(t.pending).toBe(1);
  });

  it("§2.1.2 scratch vec pool reuses", () => {
    const a = borrow2(0);
    set2(a, 3, 4);
    expect(a.x).toBe(3);
    const b = borrow2(0);
    expect(b).toBe(a);
    const c = next3();
    expect(c.y).toBe(0);
  });

  it("§2.1.3 maxDepth walk + guard", () => {
    const root = { id: 0, kids: [{ id: 1, kids: [{ id: 2, kids: [] }] }] };
    const seen: number[] = [];
    walkLimited(root, (n) => n.kids, (n) => seen.push(n.id), 2);
    expect(seen).toEqual([0, 1]);
    const g = new DepthGuard(1);
    expect(
      g.withDepth(() => g.withDepth(() => "nested", "bail"), "outer"),
    ).toBe("bail");
    expect(g.withDepth(() => "ok", "bail")).toBe("ok");
  });

  it("§2.1.4 NaN sanitize + telemetry-safe", () => {
    expect(sanitizeNumber(Number.NaN, 7)).toBe(7);
    expect(sanitizeVec3({ x: 1, y: Number.POSITIVE_INFINITY, z: 2 }).y).toBe(0);
    expect(isFinitePose({ x: 1, z: 2 })).toBe(true);
    expect(isFinitePose({ x: Number.NaN, z: 0 })).toBe(false);
  });

  it("§2.1.5 fetch circuit trips after failures", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => {
      n++;
      throw new Error("down");
    }) as unknown as typeof fetch;
    const c = new FetchCircuit({
      maxAttempts: 1,
      tripAfter: 2,
      coolMs: 60_000,
      fetchImpl,
      baseMs: 1,
      maxMs: 1,
    });
    await expect(c.fetch("/a")).rejects.toThrow();
    await expect(c.fetch("/b")).rejects.toThrow();
    expect(c.circuit).toBe("open");
    await expect(c.fetch("/c")).rejects.toThrow(/circuit open/);
    expect(n).toBe(2);
  });

  it("§2.1.6 context loss pause/restore notices", async () => {
    const w = new WebGlContextLoss();
    const phases: string[] = [];
    w.subscribe((s) => phases.push(s.phase));
    w.simulateLoss();
    expect(w.snapshot().notice).toMatch(/pausing/i);
    w.simulateRestore();
    await Promise.resolve();
    expect(phases).toContain("lost");
    expect(phases).toContain("restoring");
    expect(w.snapshot().phase).toBe("ok");
  });

  it("§2.2.2 idle detect throttle then pause", () => {
    let now = 0;
    const idle = new IdleDetect({ throttleAfterSec: 10, pauseAfterSec: 30, now: () => now });
    expect(idle.action()).toBe("none");
    now = 11_000;
    expect(idle.action()).toBe("throttle");
    expect(idle.targetFps()).toBe(15);
    now = 31_000;
    expect(idle.action()).toBe("pause");
    idle.poke();
    expect(idle.action()).toBe("none");
  });

  it("§2.2.3 resume clamps accumulator to single step", () => {
    expect(clampAccumulator(2)).toBeCloseTo(1 / 30, 5);
    expect(clampAccumulator(0.01)).toBeCloseTo(0.01, 5);
  });

  it("§2.3 auth overlay copy distinct", () => {
    expect(authOverlayFor(401).action).toBe("sign-in");
    expect(authOverlayFor(429, 12).backoffSec).toBe(12);
    expect(authOverlayFor(500).action).toBe("retry");
    expect(authOverlayFor("network").title).toMatch(/Connection/i);
  });

  it("§1.11.4 FrameBudget system attribution on overrun", () => {
    const b = new FrameBudget({ targetMs: 1, reservedMs: 0 });
    b.beginFrame(0);
    b.attribute("traffic", 5);
    b.attribute("weather", 2);
    b.beginFrame(10);
    expect(b.overruns[0]?.system).toBe("traffic");
  });

  it("§1.11.5 memory snapshot shape", () => {
    const m = readMemory();
    expect(typeof m.supported).toBe("boolean");
    expect(requestHeapSnapshotLabel()).toMatch(/^heap-/);
  });

  it("§1.3.19 trigger debug rows", () => {
    const t = { id: "s", kind: "sphere" as const, x: 0, z: 0, r: 5, armed: true };
    evalTrigger(t, { x: 0, z: 0, dt: 0.016 });
    const rows = triggerDebugRows([t]);
    expect(rows[0]?.fired).toBe(true);
    expect(rows[0]?.bounds?.r).toBe(5);
  });

  it("§1.6.2 migrate + §1.6.7 integrity lint", () => {
    const raw = { name: "old" };
    const mig = migrateManifest(raw);
    expect(mig.manifest.version).toBe(MANIFEST_CURRENT_VERSION);
    expect(mig.migrationsApplied.length).toBeGreaterThan(0);

    const good = sampleManifest();
    expect(lintManifest(good).filter((i) => i.message.includes("outside")).length).toBe(0);
    const bad = sampleManifest();
    bad.markers.push({ id: "far", kind: "poi", x: 9999, z: 9999 });
    expect(lintManifest(bad).some((i) => i.message === "outside all zones")).toBe(true);
    expect(validateManifestDeep(good).ok).toBe(true);
  });

  it("§1.6.4/5/6 graphs + tiles + hot reload preserve", () => {
    const m = sampleManifest();
    const g = graphsFromManifest(m);
    expect(g.roads.nodes.length).toBeGreaterThan(0);
    expect(g.spatial.querySector(10, 10).length).toBeGreaterThan(0);
    const tiles = tilesFromManifest(m, 64);
    expect(tiles.length).toBeGreaterThan(0);
    const hr = hotReloadManifest(m, { playerX: 12, playerZ: -3, missionStep: 2, missionId: "m1" });
    expect(hr.ok).toBe(true);
    expect(hr.preserve.playerX).toBe(12);
    expect(hr.preserve.missionStep).toBe(2);
  });

  it("§1.9.13 shared driver advances pose", () => {
    const agent = {
      id: "a0",
      dyn: { speed: 0, yaw: 0, skidding: false },
      x: 0,
      z: 0,
    };
    driveShared(agent, { throttle: 1, steer: 0, handbrake: false }, 0.1);
    expect(agent.dyn.speed).toBeGreaterThan(0);
    expect(Math.abs(agent.z) + Math.abs(agent.x)).toBeGreaterThan(0);
  });

  it("§1.10.3–5 / §1.10.11 action sets have no dead zones", () => {
    expect(actionsFor("foot")).toContain("move");
    expect(actionsFor("car")).toContain("steer");
    expect(actionsFor("boat")).toContain("rudder");
    expect(assertNoDeadZones()).toEqual([]);
  });

  it("§1.10.7 / §1.10.12 touch layout edit + persist", () => {
    const mem: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
      clear: () => {
        for (const k of Object.keys(mem)) delete mem[k];
      },
      key: () => null,
      length: 0,
    } as Storage;
    let layout = loadTouchLayout(storage);
    layout = moveWidget(layout, "move", 0.2, 0.5);
    layout = resizeWidget(layout, "action", 0.2, 0.15);
    saveTouchLayout(layout, storage);
    const again = loadTouchLayout(storage);
    expect(again.find((w) => w.id === "move")?.x).toBeCloseTo(0.2);
    expect(resetTouchLayout(storage).find((w) => w.id === "move")?.x).toBeCloseTo(0.08);
  });

  it("§1.5.T3 five legacy fixtures migrate to v2", () => {
    expect(LEGACY_V1_FIXTURES.length).toBeGreaterThanOrEqual(5);
    for (const f of LEGACY_V1_FIXTURES) {
      const v2 = migrateLegacyFixture(f);
      expect(v2.schemaVersion).toBe(SCHEMA_VERSION);
      expect(v2.stats?.cash).toBeTypeOf("number");
    }
  });

  it("§1.5.T4 atomic write kill keeps old intact", () => {
    const mem: Record<string, string> = { "save.v2": "OLD" };
    const store = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    };
    const killed = atomicWrite(store, "save.v2", "NEW", { killAfterTmp: true });
    expect(killed.phase).toBe("killed");
    expect(atomicRecover(store, "save.v2")).toBe("OLD");
    expect(mem["save.v2.tmp"]).toBe("NEW");
    const ok = atomicWrite(store, "save.v2", "NEW");
    expect(ok.ok).toBe(true);
    expect(store.getItem("save.v2")).toBe("NEW");
    expect(store.getItem("save.v2.tmp")).toBeNull();
  });

  it("§3.1.7 shooting witness raises wanted; hide decays", () => {
    const heat = new HeatAxes();
    const index = new SpatialIndex<WitnessActor>();
    index.insert({ id: "c1", x: 5, z: 0, kind: "cop" }, 5, 0);
    const r = shootWithWitnesses(heat, index, { x: 0, z: 0 }, 40);
    expect(r.wantedAfter).toBeGreaterThan(r.wantedBefore);
    const afterHide = hideDecay(heat, 30, true);
    expect(afterHide).toBeLessThan(r.wantedAfter);
  });

  it("§3.2.9 / §3.3.1 tier response + foot cops", () => {
    const r3 = responseForWanted(3);
    expect(r3.heli).toBe(true);
    expect(responseReady(r3, 10)).toBe(true);
    const cop = createFootCop("fc0", 0, 0);
    beginChase(cop, "player", [{ x: 10, z: 0 }]);
    for (let i = 0; i < 40; i++) stepFootCop(cop, 0.05, { x: 0.5, z: 0 });
    expect(["chase", "tackle", "arrest"]).toContain(cop.phase);
  });

  it("§5.1.4 / §5.4.6 weapon switch + race HUD", () => {
    const w = createWeaponSwitch();
    requestSwitch(w, "pistol");
    stepWeaponSwitch(w, 0.3);
    expect(w.current).toBe("pistol");
    const race = startRace("harbor-loop", 2)!;
    race.playerProgress = 0.5;
    const hud = raceHudModel(race);
    expect(hud.position).toBeGreaterThanOrEqual(1);
    expect(hud.checkpoints).toBe(3);
  });

  it("§4.1.5 / §10.2 / §10.5 / §10.6 ownership map tutorial audio", () => {
    const signs = ownershipSignage(
      [{ id: "anvil", name: "Anvil" }],
      ["anvil"],
    );
    expect(signs[0]?.unlocked).toBe(true);
    const fog = new MapFog(32);
    fog.reveal(0, 0, 1);
    expect(fog.isExplored(10, 10)).toBe(true);
    expect(blipsFromManifest({ fronts: [{ id: "a", x: 1, z: 2, name: "A" }] })[0]?.kind).toBe("shop");
    let tut = createTutorial();
    expect(tutorialCopy(tut.step)).toMatch(/Move/);
    tut = advanceTutorial(tut);
    expect(tut.step).toBe("drive");
    expect(skipTutorial(tut).completed).toBe(true);
    const mem: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage;
    let buses = loadBuses(storage);
    buses = setBus(buses, "music", 0.2);
    saveBuses(buses, storage);
    expect(effectiveGain(loadBuses(storage), "music")).toBeCloseTo(0.2);
  });

  it("§2.4 loco blend + §2.10 fallback + §5.2.7 cover", () => {
    const loco = createLoco();
    expect(stepLoco(loco, 0.1, { speed: 2, sprint: false, grounded: true, jump: false, yawDelta: 0 })).toBe("walk");
    expect(stepLoco(loco, 0.1, { speed: 5, sprint: true, grounded: true, jump: false, yawDelta: 0 })).toBe("run");
    expect(FALLBACK_GROUND.size).toBeGreaterThan(0);
    expect(fallbackNotice("tile-500")).toMatch(/fallback/i);
    const cover = createCoverState();
    const spot = nearestCover([{ id: "c0", x: 1, z: 0, yaw: 0, side: "left" }], 0, 0)!;
    enterCover(cover, spot);
    expect(cover.inCover).toBe(true);
  });

  it("§5.3.4 boats + §6.1.3 safehouses + §4.2.4 ownership UI + §3.3.7 corpse", () => {
    expect(BOAT_CATALOG.length).toBeGreaterThanOrEqual(3);
    expect(new Set(BOAT_CATALOG.map((b) => b.tuning.maxSpeed)).size).toBe(3);
    expect(unlockedSafehouses([]).some((s) => s.unlockCost === 0)).toBe(true);
    expect(canUnlock(5000, "island-cabin", [])).toBe(true);
    expect(SAFEHOUSES.length).toBeGreaterThanOrEqual(3);
    const rows = ownershipRows([{ id: "a", name: "A", cost: 100 }], ["a"]);
    expect(rows[0]?.status).toBe("owned");
    const corpses = new CorpseField();
    corpses.add({ id: "officer-1", x: 0, z: 0, kind: "cop" });
    expect(corpses.list().length).toBe(1);
  });

  it("§6.2 interiors + wardrobe + §7.4 gloria/swim + §8 cutscene/arrow", () => {
    const sess = createInteriorSession();
    enterInterior(sess, INTERIORS[0]!);
    expect(sess.interiorId).toBeTruthy();
    const w = createWardrobe();
    expect(buyOutfit(w, "dock", 200).ok).toBe(true);
    expect(equipOutfit(w, "dock")).toBe(true);
    const g = createGloria();
    startGloria(g, 0.9);
    expect(g.waterRise).toBeGreaterThan(1);
    expect(g.frictionMul).toBeLessThan(1);
    const swim = createSwim();
    stepSwim(swim, { inWater: true, throttle: 1, dt: 0.1 });
    expect(swim.active).toBe(true);
    const track = startTrack({
      id: "open",
      duration: 2,
      skippable: true,
      camera: [
        { t: 0, x: 0, y: 2, z: 0, lookX: 0, lookY: 1, lookZ: 1 },
        { t: 2, x: 5, y: 2, z: 5, lookX: 1, lookY: 1, lookZ: 2 },
      ],
      cues: [{ t: 0.5, entityId: "npc", clip: "wave" }],
    });
    const cues = stepTrack(track, 0.6);
    expect(cues.length).toBe(1);
    expect(sampleCamera(track).x).toBeGreaterThan(0);
    skipTrack(track);
    expect(track.done).toBe(true);
    const arrow = worldArrow({ x: 0, z: 0, yaw: 0 }, { x: 10, z: 0 });
    expect(arrow.distance).toBeGreaterThan(9);
    expect(inMissionRange("boat", { x: 0, z: 0 }, { x: 4, z: 0 }, 4)).toBe(true);
  });

  it("§9 sfx catalogs + deferred music + §11.4 corrupt save + §4.5 balance", async () => {
    expect(assertSfxCatalog()).toEqual([]);
    expect(impactSfx("metal", "heavy")).toBe("impact.metal.heavy");
    expect(WEAPON_SFX.pistol.fire).toMatch(/pistol/);
    const m = createDeferredMusic();
    await loadMusicDeferred(m, "bed-a");
    expect(m.state).toBe("ready");
    const prompt = corruptSavePrompt("slot0", "bad json");
    expect(prompt.actions).toContain("discard");
    const mem: Record<string, string> = { slot0: "{bad" };
    const store = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    };
    applyCorruptAction("export", store, "slot0");
    expect(mem["slot0.export"]).toBe("{bad");
    const mins = projectedFirstUpgradeMin(100, 1500, 500);
    expect(mins).toBeLessThanOrEqual(20);
    expect(meetsFirstUpgradeGate(mins)).toBe(true);
  });

  it("§9.5.3 VO-silent + §11.4.4 new game + §7.1 dispose/impostor", () => {
    const shown: string[] = [];
    const r = deliverNarrative(
      [
        { id: "a", text: "Hello", voKey: "vo.a" },
        { id: "b", text: "World" },
      ],
      { voEnabled: false, showText: (t) => shown.push(t) },
    );
    expect(r.shown).toEqual(["a", "b"]);
    expect(r.spoken).toEqual([]);
    expect(shown).toHaveLength(2);
    const mem: Record<string, string> = { race: "1", settings: "x", s0: "y" };
    const cleared = applyNewGame(DEFAULT_NEW_GAME, {
      removeItem: (k) => {
        delete mem[k];
      },
    }, { raceBests: "race", settings: "settings", slots: ["s0"] });
    expect(cleared).toContain("race");
    expect(mem.settings).toBe("x");
    expect(impostorsForTiles([{ id: "t0", minX: 1000, maxX: 1256, minZ: 1000, maxZ: 1256 }], { x: 0, z: 0 }).length).toBe(1);
    const disposed = disposeObject3D({
      geometry: { dispose: () => undefined },
      material: { dispose: () => undefined },
      children: [{ geometry: { dispose: () => undefined } }],
    });
    expect(disposed).toBe(3);
  });

  it("§7.5.3 fog + §8.4/8.5 mission flows + §9.2.5 siren + §10 remap/a11y/route", () => {
    const fog = createFog(false);
    const before = visibilityOf(fog);
    setFogEnabled(fog, true);
    expect(visibilityOf(fog)).toBeLessThan(before);
    const ents = createMissionEntities(["a", "b", "c"]);
    expect(allFlowsExercised(ents)).toBe(true);
    const counts = fireOnceReplay(
      [
        { id: "s", kind: "sphere", x: 0, z: 0, r: 5 },
        { id: "t", kind: "timer", duration: 0 },
      ],
      { x: 0, z: 0, dt: 1 },
    );
    expect(counts.sphere).toBe(1);
    expect(counts.timer).toBe(1);
    const pan = sirenPan({ x: 0, z: 0, yaw: 0 }, { x: 10, z: 0 });
    expect(pan.gain).toBeGreaterThan(0);
    expect(Math.abs(pan.pan)).toBeGreaterThan(0.5);
    const route = routeLineFromPath([
      { x: 0, z: 0 },
      { x: 3, z: 4 },
    ]);
    expect(routeLength(route)).toBeCloseTo(5);
    expect(labelFor("health")).toMatch(/health/i);
    expect(MAP_LEGEND.length).toBeGreaterThan(3);
    expect(actionsFor("foot")).toContain("interact");
    const mem: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage;
    let map = loadKeyMap(storage);
    map = remap(map, "interact", "KeyF");
    saveKeyMap(map, storage);
    expect(bindingFor(loadKeyMap(storage), "interact")).toBe("KeyF");
    saveGraphicsPreset("low", storage);
    expect(loadGraphicsPreset(storage)).toBe("low");
    expect(presetOf("low").quality).toBe(0);
  });

  it("§2.6/§2.10/§3.4/§7.6–7.7/§8.6/§10.6–10.8 polish stubs", () => {
    const lights = createLightBudget(2);
    expect(tryAddLight(lights)).toBe(true);
    expect(tryAddLight(lights)).toBe(true);
    expect(tryAddLight(lights)).toBe(false);
    expect(lodLevel(10)).toBe(0);
    expect(lodFade(40)).toBeGreaterThanOrEqual(0);
    expect(resolveVehicleModel(null, true)).toBe("fallback");
    expect(factionResponse({ hostility: 0.8, inTerritory: true, wanted: 3 })).toBe("drive-by");
    expect(hostileEntryEscalate(40)).toBe(true);
    const mem: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage;
    saveLang("es", storage);
    expect(loadLang(storage)).toBe("es");
    expect(missingHudSources(["health", "cash"]).length).toBeGreaterThan(0);
    expect(brandConflicts([CANONICAL_BRAND, "Hello"])).toEqual([]);
    expect(FISH_PIER_OPENING.id).toBe("fish-pier-opening");
    const p = startTrack(FISH_PIER_OPENING);
    stepTrack(p, 2);
    expect(waterReflectionForQuality(2).mirror).toBe(true);
    const hb = headlightBudget(1);
    expect(useSpotlight(50, hb, 0)).toBe(true);
    const mem2: Record<string, string> = { a: '{"ok":1}', b: "NOT_JSON" };
    const store2 = {
      getItem: (k: string) => mem2[k] ?? null,
      setItem: (k: string, v: string) => {
        mem2[k] = v;
      },
      removeItem: (k: string) => {
        delete mem2[k];
      },
    };
    expect(safeLoadSlot(store2, "b").ok).toBe(false);
    swapSlots(store2, "a", "b");
    expect(safeLoadSlot(store2, "b").ok).toBe(true);
  });
});
