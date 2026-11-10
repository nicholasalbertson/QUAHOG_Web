import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { autosaveDue, AUTOSAVE_INTERVAL_MS, canContinue, clearAllSaves, loadUnified } from "../../sim/SaveGame";
import { saveJSON, setItem, getItem } from "../../storage";
import { SAVE_KEYS } from "../../registries";
import { useStats } from "../../game";

// Continue acceptance contract (2026-11-09). ONE gate — canContinue() — is
// the authority for the title menu, the v2 migration and the acceptance
// harness. See the doc comment on canContinue() for the rules.
const STATS = { cash: 900, health: 80, police: 0, faction: 0 };
const POS = { mode: "foot", px: 10, py: 2, pz: -30, heading: 0.5 };

describe("Continue acceptance contract", () => {
  beforeEach(() => { clearAllSaves(); });

  it("fresh install: no Continue, reason is 'no saved game' (not 'missing stats')", () => {
    const g = canContinue();
    expect(g.ok).toBe(false);
    expect(g.reason).toBe("no saved game");
  });

  it("stats-only is NOT a save (title-screen autosave phantom)", () => {
    // The stats store used to be written on the first rendered frame of the
    // title screen; a reload then offered Continue for a game never started.
    useStats.getState().reset();
    useStats.getState().save();
    expect(getItem(SAVE_KEYS.stats)).toBeTruthy();
    expect(canContinue().ok).toBe(false);
  });

  it("position-only save continues with default stats (2026-11-07 jetsam case)", () => {
    saveJSON(SAVE_KEYS.pos, POS);
    const g = canContinue();
    expect(g.ok).toBe(true);
    expect(g.restores).toEqual({ position: true, stats: false, mission: false });
  });

  it("full legacy save restores every domain with no notes", () => {
    saveJSON(SAVE_KEYS.stats, STATS);
    saveJSON(SAVE_KEYS.pos, POS);
    saveJSON(SAVE_KEYS.mission, { mi: 2, step: 1, done: false });
    const g = canContinue();
    expect(g).toEqual({ ok: true, restores: { position: true, stats: true, mission: true }, notes: [] });
  });

  it("in-car save with only car coordinates counts as a usable position", () => {
    saveJSON(SAVE_KEYS.pos, { mode: "car", carx: 5, cary: 1.4, carz: 9, carYaw: 1 });
    expect(canContinue().restores?.position).toBe(true);
  });

  it("pre-body position record (mode only) still continues, at the district spawn", () => {
    // savePos() before the physics body exists writes px/pz as undefined.
    saveJSON(SAVE_KEYS.stats, STATS);
    saveJSON(SAVE_KEYS.pos, { mode: "foot", heading: 0 });
    const g = canContinue();
    expect(g.ok).toBe(true);
    expect(g.restores?.position).toBe(false);
    expect(g.notes?.join(" ")).toMatch(/position/i);
  });

  it("a malformed mission record never hides Continue (New Game would wipe cash)", () => {
    saveJSON(SAVE_KEYS.stats, STATS);
    saveJSON(SAVE_KEYS.pos, POS);
    saveJSON(SAVE_KEYS.mission, { done: false });
    const g = canContinue();
    expect(g.ok).toBe(true);
    expect(g.restores?.mission).toBe(false);
    expect(g.notes?.join(" ")).toMatch(/mission/i);
  });

  it("corrupt position + readable stats: Continue stays, position is flagged", () => {
    saveJSON(SAVE_KEYS.stats, STATS);
    setItem(SAVE_KEYS.pos, "{not json");
    const g = canContinue();
    expect(g.ok).toBe(true);
    expect(g.restores).toEqual({ position: false, stats: true, mission: false });
  });

  it("non-finite / wrong-typed coordinates are not a usable position", () => {
    saveJSON(SAVE_KEYS.stats, STATS);
    setItem(SAVE_KEYS.pos, JSON.stringify({ mode: "foot", px: "12", pz: null }));
    expect(canContinue().restores?.position).toBe(false);
  });

  it("everything unreadable: Continue refused as corrupt, nothing deleted", () => {
    setItem(SAVE_KEYS.stats, "][");
    setItem(SAVE_KEYS.pos, "{not json");
    const g = canContinue();
    expect(g.ok).toBe(false);
    expect(g.reason).toBe("corrupt save");
    expect(getItem(SAVE_KEYS.pos)).toBe("{not json"); // the gate never deletes
    expect(getItem(SAVE_KEYS.stats)).toBe("][");
  });

  it("mission-only (pos key lost) still continues at spawn with mission progress", () => {
    saveJSON(SAVE_KEYS.mission, { mi: 3, step: 0, done: false });
    const g = canContinue();
    expect(g.ok).toBe(true);
    expect(g.restores).toEqual({ position: false, stats: false, mission: true });
  });

  it("schema-2 migration follows the same gate (pos-only migrates)", () => {
    expect(loadUnified()).toBeNull();
    saveJSON(SAVE_KEYS.pos, POS);
    const blob = loadUnified();
    expect(blob?.schemaVersion).toBe(2);
    expect(blob?.position).toMatchObject({ px: 10, pz: -30 });
  });

  it("autosave never runs on the title screen and runs on the first started frame", () => {
    expect(autosaveDue({ started: false, nowMs: 1e9, lastMs: 0 })).toBe(false);
    expect(autosaveDue({ started: true, nowMs: 50, lastMs: Number.NEGATIVE_INFINITY })).toBe(true);
    expect(autosaveDue({ started: true, nowMs: 1000 + AUTOSAVE_INTERVAL_MS - 1, lastMs: 1000 })).toBe(false);
    expect(autosaveDue({ started: true, nowMs: 1000 + AUTOSAVE_INTERVAL_MS + 1, lastMs: 1000 })).toBe(true);
  });
});

describe("Continue gate wiring (single authority)", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");
  it("StartMenu uses canContinue() and carries no save-key literals", () => {
    const src = read("ui/StartMenu.tsx");
    expect(src).toMatch(/canContinue\(\)/);
    expect(src).not.toMatch(/mounthope\.(save|pos|mission)\.v\d/);
  });
  it("GameSystems and the stats store take their keys from SAVE_KEYS", () => {
    for (const f of ["world/GameSystems.tsx", "game.ts"]) {
      expect(read(f), f).not.toMatch(/"mounthope\.[a-zA-Z]+\.v\d"/);
    }
    expect(read("world/GameSystems.tsx")).toMatch(/autosaveDue\(/);
  });
});
