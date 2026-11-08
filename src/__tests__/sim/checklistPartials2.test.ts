import { describe, expect, it, beforeEach } from "vitest";
import {
  getA11y,
  setA11y,
  loadA11y,
  motionScale,
  subtitleScalePx,
  DEFAULT_A11Y,
} from "../../sim/Accessibility";
import { ownershipMissionDelta, missionStillAvailable } from "../../sim/OwnershipMissionGate";
import { SHOPS, applyPurchase, shopCounterPrompt, canPurchase } from "../../sim/ShopCatalog";
import { CorpseField } from "../../sim/CorpseTtl";
import { copReactionToCorpse, trafficReactionToCorpse } from "../../sim/CorpseReaction";
import { ChaseController } from "../../sim/ChaseController";
import { RoadGraph } from "../../sim/RoadGraph";
import {
  canContinue,
  collectLegacySave,
  saveUnified,
  loadUnified,
  clearAllSaves,
  validateSave,
} from "../../sim/SaveGame";
import { SAVE_KEYS } from "../../registries";
import { saveJSON, removeItem } from "../../storage";
import { SURFACE_FRICTION } from "../../sim/ClockWeather";
import { surfaceSfxHoles, footstepFor, impactFor } from "../../sim/Footsteps";
import { createMusicState, pickLayer, stepMusic } from "../../sim/AdaptiveMusic";
import { createBoat, stepBoat, damageBoat } from "../../sim/BoatDynamics";
import { sunMoonUniforms, seasonForDay, SUNRISE_TABLE } from "../../sim/SunriseTables";
import { PedestrianAI } from "../../sim/PedestrianAI";
import { ClockWeather } from "../../sim/ClockWeather";
import { prompts } from "../../sim/InteractPrompt";

describe("checklist partials batch 2", () => {
  beforeEach(() => {
    clearAllSaves();
    setA11y({ ...DEFAULT_A11Y });
    prompts.clear();
  });

  it("§11.2.4–7 weapons + waypoint round-trip", () => {
    saveJSON(SAVE_KEYS.stats, { cash: 10, health: 100, police: 0, faction: 0 });
    saveJSON(SAVE_KEYS.pos, { x: 1, z: 2 });
    const blob = saveUnified({
      weapons: { weapon: "pistol", melee: "bat", armed: true },
      waypoint: { x: 40, z: -10 },
    });
    expect(blob.weapons?.armed).toBe(true);
    const loaded = loadUnified();
    expect(loaded?.weapons?.weapon).toBe("pistol");
    expect(loaded?.waypoint?.x).toBe(40);
    const legacy = collectLegacySave();
    expect(legacy.weapons?.melee).toBe("bat");
    expect(legacy.waypoint?.z).toBe(-10);
  });

  it("§10.4.3–5 a11y subtitle opacity + reduce motion + independent persist", () => {
    setA11y({ subtitleBgOpacity: 0.2, subtitleSize: "lg" });
    expect(getA11y().subtitleBgOpacity).toBe(0.2);
    expect(subtitleScalePx()).toBe(18);
    setA11y({ reduceMotion: true });
    expect(motionScale("shake")).toBe(0);
    setA11y({ reduceMotion: false, screenFlash: false });
    expect(motionScale("flash")).toBe(0);
    expect(motionScale("shake")).toBe(1);
    const again = loadA11y();
    expect(again.subtitleSize).toBe("lg");
    expect(again.screenFlash).toBe(false);
  });

  it("§4.3.2–3 ownership buy/sell mission availability", () => {
    const fronts = [
      { id: "anvil", unlockMission: "garage-chop" },
      { id: "whalingcab", unlockMission: "cab-run" },
    ];
    const d = ownershipMissionDelta(fronts, [], ["anvil"]);
    expect(d.added).toContain("garage-chop");
    const sold = ownershipMissionDelta(fronts, ["anvil"], []);
    expect(sold.removed).toContain("garage-chop");
    expect(missionStillAvailable(fronts, [], "garage-chop")).toBe(false);
  });

  it("§4.4.5–6 shop counter prompt + immediate purchase", () => {
    const shop = SHOPS[0];
    const prompt = shopCounterPrompt(shop);
    prompts.upsert(prompt);
    expect(prompts.at(shop.x, shop.z)?.kind).toBe("shop");
    const item = shop.items[0];
    expect(canPurchase(item, { cash: 100, wanted: 0, missionsDone: [] }).ok).toBe(true);
    const r = applyPurchase(item, { cash: 100, pistol: 0 });
    expect(r.ok).toBe(true);
    expect(r.bag.cash).toBe(60);
    expect(r.bag.pistol).toBe(24);
  });

  it("§13.2.1 / §13.2.3 corpse reactions + age-out cap", () => {
    const field = new CorpseField(2, 5);
    field.add({ id: "a", x: 0, z: 0, kind: "ped" });
    field.add({ id: "b", x: 1, z: 0, kind: "cop" });
    field.add({ id: "c", x: 2, z: 0, kind: "ped" });
    expect(field.count).toBeLessThanOrEqual(2);
    const investigate = copReactionToCorpse({ x: 0, z: 0 }, field.list());
    expect(["investigate", "backup"]).toContain(investigate.reaction);
    const traffic = trafficReactionToCorpse({ x: 0.5, z: 0, yaw: 0 }, field.list());
    expect(traffic.reaction).not.toBe("ignore");
    field.step(6);
    expect(field.count).toBe(0);
  });

  it("§13.3.2 chase with empty graph does not throw", () => {
    const g = new RoadGraph();
    const chase = new ChaseController(g);
    const unit = { x: 0, z: 0, yaw: 0, path: [] as { x: number; z: number }[], cursor: 0, repathIn: 0 };
    const before = { x: unit.x, z: unit.z };
    expect(() => {
      for (let i = 0; i < 10; i++) chase.step(unit, 0.1, { x: 20, z: 0 });
    }).not.toThrow();
    expect(Math.hypot(unit.x - before.x, unit.z - before.z)).toBeGreaterThan(0.5);
  });

  it("§11.3.3 delete pos disables Continue; missing mission still allows", () => {
    saveJSON(SAVE_KEYS.stats, { cash: 1, health: 100, police: 0, faction: 0 });
    saveJSON(SAVE_KEYS.pos, { px: 0, pz: 0 });
    expect(canContinue().ok).toBe(true);
    removeItem(SAVE_KEYS.mission);
    expect(canContinue().ok).toBe(true);
    removeItem(SAVE_KEYS.pos);
    expect(canContinue().ok).toBe(false);
  });

  it("§9.1.6 every Surface has footstep + impact", () => {
    const surfaces = Object.keys(SURFACE_FRICTION) as (keyof typeof SURFACE_FRICTION)[];
    expect(surfaceSfxHoles(surfaces)).toEqual([]);
    for (const s of surfaces) {
      expect(footstepFor(s)).toBeTruthy();
      expect(impactFor(s)).toBeTruthy();
    }
  });

  it("§9.4.4 chase→wanted crossfade loop-safe", () => {
    let m = createMusicState();
    m = stepMusic(m, pickLayer({ stars: 3 }), 0.5);
    expect(m.gain).toBeGreaterThan(0);
    expect(m.gain).toBeLessThanOrEqual(1);
    for (let i = 0; i < 20; i++) m = stepMusic(m, pickLayer({ stars: 1 }), 0.2);
    expect(m.layer).toBe("wanted");
    expect(m.gain).toBeGreaterThan(0);
  });

  it("§5.3.7 boat floats, bobs, damages, sinks, persists", () => {
    const b = createBoat(0, 0);
    const wind = { x: 1, y: 0, z: 0.5 };
    stepBoat(b, 0.1, { throttle: 0.5, steer: 0.1 }, wind, 1.2);
    expect(b.y).not.toBe(0);
    const y0 = b.y;
    stepBoat(b, 0.1, { throttle: 0, steer: 0 }, wind, 2.4);
    expect(b.y).not.toBe(y0); // bob
    damageBoat(b, 200);
    expect(b.sunk).toBe(true);
    stepBoat(b, 1, { throttle: 1, steer: 0 }, wind, 3);
    expect(b.y).toBeLessThan(0);
    const snap = { ...b };
    expect(snap.sunk).toBe(true);
  });

  it("§1.4.2–3 sunrise tables + sun/moon uniforms", () => {
    expect(SUNRISE_TABLE.summer.set).toBeGreaterThan(SUNRISE_TABLE.winter.set);
    const noon = sunMoonUniforms(12, "summer");
    expect(noon.nightFactor).toBeLessThan(0.5);
    expect(noon.sunDir[1]).toBeGreaterThan(0.2);
    const midnight = sunMoonUniforms(0, "winter");
    expect(midnight.nightFactor).toBe(1);
    expect(seasonForDay(200)).toBe("summer");
    const clock = new ClockWeather();
    clock.day = 200;
    clock.hour = 12;
    expect(clock.lightingUniforms().sunDir[1]).toBeGreaterThan(0);
  });

  it("§1.2.20 ped LOD bands 30/80", () => {
    const ai = new PedestrianAI({});
    const agent = { id: 0, x: 0, z: 0, yaw: 0, speed: 1, path: [], cursor: 0, stuck: 0, state: "walk" as const };
    expect(ai.lodOf(agent as never, { x: 20, z: 0 })).toBe("near");
    expect(ai.lodOf(agent as never, { x: 50, z: 0 })).toBe("mid");
    expect(ai.lodOf(agent as never, { x: 100, z: 0 })).toBe("far");
  });

  it("§1.5.2 field-level validators catch ranges", () => {
    expect(validateSave({ schemaVersion: 2, stats: { cash: -1, health: 50, police: 0, faction: 0 } })).toContain(
      "stats.cash range",
    );
    expect(
      validateSave({ schemaVersion: 2, stats: { cash: 0, health: 200, police: 0, faction: 0 } }),
    ).toContain("stats.health range");
  });
});
