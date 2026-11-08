// §2.8 earth gameplay loop — the shared mission rule + the earth mission
// run (a full mission completable start-to-finish from the earth pose).
import { describe, it, expect, beforeEach } from "vitest";
import { stepComplete } from "../sim/missionComplete";
import { useMission, MISSIONS } from "../mission";
import { useStats } from "../game";
import { earthWeatherToSim } from "../earth/EarthSimBridge";
import { playState } from "../earth/playState";

describe("§2.8.1 mission completion rule (shared by both runners)", () => {
  it("completes inside the target radius, not outside it", () => {
    const step = { text: "Go", target: [100, 0, 200] as [number, number, number], radius: 10 };
    expect(stepComplete(step, { pos: { x: 105, z: 205 }, driving: false, police: 0 })).toBe(true);
    expect(stepComplete(step, { pos: { x: 200, z: 200 }, driving: false, police: 0 })).toBe(false);
  });

  it("needCar requires driving; noHeat requires police 0", () => {
    const car = { text: "Drive", target: [0, 0, 0] as [number, number, number], radius: 10, needCar: true };
    expect(stepComplete(car, { pos: { x: 0, z: 0 }, driving: false, police: 0 })).toBe(false);
    expect(stepComplete(car, { pos: { x: 0, z: 0 }, driving: true, police: 0 })).toBe(true);
    const cool = { text: "Cool off", target: [0, 0, 0] as [number, number, number], radius: 10, noHeat: true };
    expect(stepComplete(cool, { pos: { x: 0, z: 0 }, driving: false, police: 1 })).toBe(false);
    expect(stepComplete(cool, { pos: { x: 0, z: 0 }, driving: false, police: 0 })).toBe(true);
  });

  it("a step with no target completes (reach-only steps are the target ones)", () => {
    expect(stepComplete({ text: "Wait" }, { pos: { x: 999, z: 999 }, driving: false, police: 5 })).toBe(true);
  });
});

describe("§2.8.5 full mission completable start-to-finish in earth", () => {
  beforeEach(() => {
    useMission.getState().reset();
    useStats.getState().reset();
  });

  it("drives the real mission store through all 11 missions from the earth pose", () => {
    // The earth pose source is playState.player (written by PlayerRig).
    // Teleport it to each step's target (as if the player drove there) and
    // advance via the shared rule — the same path EarthMissionRunner takes.
    let advances = 0;
    for (let guard = 0; guard < 100 && !useMission.getState().done; guard++) {
      const ms = useMission.getState();
      const cur = ms.steps[ms.step];
      if (!cur) break;
      if (cur.target) {
        playState.player.pos.set(cur.target[0], 0, cur.target[2]);
      }
      playState.player.driving = !!cur.needCar;
      const ok = stepComplete(cur, {
        pos: { x: playState.player.pos.x, z: playState.player.pos.z },
        driving: playState.player.driving,
        police: useStats.getState().police,
      });
      expect(ok).toBe(true);
      if (cur.reward) useStats.getState().addCash(cur.reward);
      ms.advance();
      advances++;
    }
    expect(useMission.getState().done).toBe(true);
    expect(useMission.getState().objective).toBe("Campaign complete — the Narrows is yours.");
    expect(advances).toBe(MISSIONS.reduce((a, m) => a + m.steps.length, 0));
    // Rewards paid along the way (M01 step 1 pays 250, M11 pays 10000).
    expect(useStats.getState().cash).toBeGreaterThan(250);
  });
});

describe("§2.8 earth weather mapping", () => {
  it("maps earth weather to the sim weather (cloudy has no sim equivalent)", () => {
    expect(earthWeatherToSim("clear")).toBe("clear");
    expect(earthWeatherToSim("rain")).toBe("rain");
    expect(earthWeatherToSim("cloudy")).toBe("clear");
  });
});
