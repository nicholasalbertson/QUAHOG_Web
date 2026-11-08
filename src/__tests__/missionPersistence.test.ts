// §8.1.3 — mission step persists across save/reload, per mission.
// Uses the real save/restore from GameSystems (the same functions the game
// calls on save + boot), against the localStorage stub in setup.ts.
import { describe, it, expect, beforeEach } from "vitest";
import { MISSIONS, useMission } from "../mission";
import { saveMissionProgress, restoreMissionProgress } from "../world/GameSystems";
import { SAVE_KEYS } from "../registries";
import { loadJSON, saveJSON } from "../storage";

describe("§8.1.3 mission persistence", () => {
  beforeEach(() => {
    useMission.getState().reset();
    try { localStorage.removeItem(SAVE_KEYS.mission); } catch { /* noop */ }
  });

  it("round-trips a mid-campaign step through save + restore", () => {
    // Advance to mission 6 (Acquitted), step 1: M01(1) + M02(3) + M03(3) +
    // M04(2) + M05(2) = 11 advances to reach M06 step 0, +1 for step 1.
    useMission.getState().reset();
    for (let i = 0; i < 12; i++) useMission.getState().advance();
    expect(useMission.getState().title).toBe("Acquitted");
    expect(useMission.getState().step).toBe(1);

    saveMissionProgress();
    useMission.getState().reset();
    expect(useMission.getState().title).toBe("Off the Boat");

    restoreMissionProgress();
    expect(useMission.getState().title).toBe("Acquitted");
    expect(useMission.getState().step).toBe(1);
    expect(useMission.getState().objective).toBe(MISSIONS[5].steps[1].text);
  });

  it("round-trips a completed campaign (done flag)", () => {
    const ms = useMission.getState();
    for (let i = 0; i < 24; i++) ms.advance();
    expect(useMission.getState().done).toBe(true);
    saveMissionProgress();
    useMission.getState().reset();
    restoreMissionProgress();
    expect(useMission.getState().done).toBe(true);
    expect(useMission.getState().objective).toBe("Campaign complete — the Narrows is yours.");
  });

  it("clamps an out-of-range saved mission instead of crashing", () => {
    saveJSON(SAVE_KEYS.mission, { mi: 99, step: 99, done: false });
    restoreMissionProgress();
    expect(useMission.getState().mi).toBe(MISSIONS.length - 1);
    expect(useMission.getState().step).toBeLessThanOrEqual(
      MISSIONS[MISSIONS.length - 1].steps.length - 1,
    );
  });

  it("ignores a missing or malformed saved mission (stays on the opener)", () => {
    restoreMissionProgress();
    expect(useMission.getState().title).toBe("Off the Boat");
    saveJSON(SAVE_KEYS.mission, { mi: "six", step: null });
    restoreMissionProgress();
    expect(useMission.getState().title).toBe("Off the Boat");
  });

  it("the saved record is exactly {mi, step, done}", () => {
    // One advance chains past M01's only step into M02 (mi 1, step 0).
    useMission.getState().advance();
    saveMissionProgress();
    const raw = loadJSON<Record<string, unknown>>(SAVE_KEYS.mission, {});
    expect(Object.keys(raw).sort()).toEqual(["done", "mi", "step"]);
    expect(raw.mi).toBe(1);
    expect(raw.step).toBe(0);
    expect(raw.done).toBe(false);
  });
});
