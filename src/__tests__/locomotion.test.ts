// §2.4 locomotion gait math — pure, testable without rendering a Character.
import { describe, it, expect } from "vitest";
import { stepGait, gaitSpeedMps, clampSpeed, slewHeading, stepJump, JUMP_VELOCITY, GRAVITY, type GaitState, type JumpState } from "../world/locomotion";

const fresh = (): GaitState => ({ phase: 0, gait: 0, breath: 0, air: 0 });

describe("§2.4 locomotion gait", () => {
  it("idle (speed 0) has no leg swing and breathes (bob + torso pitch vary)", () => {
    const s = fresh();
    const poses = Array.from({ length: 60 }, () => stepGait(s, 0, 1 / 60));
    for (const p of poses) {
      expect(p.legL).toBeCloseTo(0, 10);
      expect(p.legR).toBeCloseTo(0, 10);
    }
    // Breathing: the bob + torso pitch oscillate (non-zero somewhere over 1 s).
    expect(Math.max(...poses.map((p) => Math.abs(p.bobY)))).toBeGreaterThan(0.005);
    expect(Math.max(...poses.map((p) => Math.abs(p.torsoPitch)))).toBeGreaterThan(0.005);
    expect(s.gait).toBe(0);
  });

  it("walk (speed 1) blends the gait in and swings the legs opposite", () => {
    const s = fresh();
    let p = stepGait(s, 1, 1 / 60);
    expect(s.gait).toBeGreaterThan(0);
    // After ~1 s the gait is essentially fully blended in.
    for (let i = 0; i < 60; i++) p = stepGait(s, 1, 1 / 60);
    expect(s.gait).toBeGreaterThan(0.99);
    expect(p.legL).toBeCloseTo(-p.legR, 10);
    expect(Math.abs(p.legL)).toBeLessThanOrEqual(0.6 + 1e-9);
  });

  it("run (speed 2) has a faster phase rate and a larger swing than walk", () => {
    const walk = fresh();
    const run = fresh();
    // Blend both gaits fully in first, then compare one step's phase advance.
    for (let i = 0; i < 60; i++) { stepGait(walk, 1, 1 / 60); stepGait(run, 2, 1 / 60); }
    const walkPhase = walk.phase;
    const runPhase = run.phase;
    stepGait(walk, 1, 1 / 60);
    stepGait(run, 2, 1 / 60);
    expect(run.phase - runPhase).toBeGreaterThan(walk.phase - walkPhase);
    // Run swing amplitude (0.85) exceeds walk (0.6): sample the max over a second.
    const runMax = Math.max(...Array.from({ length: 60 }, () => Math.abs(stepGait(run, 2, 1 / 60).legL)));
    const walkMax = Math.max(...Array.from({ length: 60 }, () => Math.abs(stepGait(walk, 1, 1 / 60).legL)));
    expect(runMax).toBeGreaterThan(walkMax);
    expect(runMax).toBeLessThanOrEqual(0.85 + 1e-9);
  });

  it("stopping blends the gait back out (no popping)", () => {
    const s = fresh();
    for (let i = 0; i < 60; i++) stepGait(s, 1, 1 / 60);
    expect(s.gait).toBeGreaterThan(0.99);
    const first = stepGait(s, 0, 1 / 60);
    expect(s.gait).toBeLessThan(1);
    expect(Math.abs(first.legL)).toBeLessThan(0.6);
    for (let i = 0; i < 120; i++) stepGait(s, 0, 1 / 60);
    expect(s.gait).toBeLessThan(0.01);
  });

  it("speed clamps to [0, 2] and maps to the earth foot speeds", () => {
    expect(clampSpeed(99)).toBe(2);
    expect(clampSpeed(-1)).toBe(0);
    expect(gaitSpeedMps(0)).toBe(0);
    expect(gaitSpeedMps(1)).toBe(4.5);
    expect(gaitSpeedMps(2)).toBe(9);
  });

  it("§2.4.7 slewHeading takes the short way around and caps the turn rate", () => {
    // 180° reversal at 360°/s: after 0.25 s the heading has moved 90°, not snapped.
    const h = slewHeading(0, Math.PI, Math.PI * 2, 0.25);
    expect(h).toBeCloseTo(Math.PI / 2, 10);
    // Wraparound: from +170° to -170° is a 20° turn, not 340°.
    const w = slewHeading((170 * Math.PI) / 180, (-170 * Math.PI) / 180, Math.PI * 2, 1);
    expect(w).toBeCloseTo((-170 * Math.PI) / 180, 10);
    // Small diffs snap to the target.
    expect(slewHeading(0, 0.1, Math.PI * 2, 1)).toBeCloseTo(0.1, 10);
  });

  it("§2.4.5 stepJump rises, falls, and lands (gravity 22, jump 6.5)", () => {
    const s: JumpState = { y: 0, vy: 0, grounded: true };
    const first = stepJump(s, 1 / 60, true);
    expect(first.jumped).toBe(true);
    expect(s.grounded).toBe(false);
    expect(s.vy).toBeCloseTo(JUMP_VELOCITY - GRAVITY / 60, 5);
    // Holding jump does not re-jump mid-air.
    expect(stepJump(s, 1 / 60, true).jumped).toBe(false);
    // Apex ≈ v²/2g ≈ 0.96 m, then fall back to the ground.
    let apex = 0;
    let landed = false;
    for (let i = 0; i < 120; i++) {
      const r = stepJump(s, 1 / 60, false);
      apex = Math.max(apex, s.y);
      if (r.landed) { landed = true; break; }
    }
    expect(landed).toBe(true);
    expect(s.grounded).toBe(true);
    expect(s.y).toBe(0);
    expect(apex).toBeGreaterThan(0.8);
    expect(apex).toBeLessThan(1.1);
  });

  it("§2.4.5 airborne pose tucks the legs and raises the arms", () => {
    const s = fresh();
    for (let i = 0; i < 60; i++) stepGait(s, 1, 1 / 60); // walk, gait blended in
    let p = stepGait(s, 1, 1 / 60, true);
    expect(s.air).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) p = stepGait(s, 1, 1 / 60, true);
    expect(s.air).toBeGreaterThan(0.99);
    expect(p.legL).toBeCloseTo(-0.6, 3);
    expect(p.legR).toBeCloseTo(0.4, 3);
    expect(p.armL).toBeCloseTo(-0.8, 3);
    expect(p.bobY).toBeCloseTo(0, 5);
    // Landing blends back to the walk pose.
    for (let i = 0; i < 60; i++) p = stepGait(s, 1, 1 / 60, false);
    expect(s.air).toBeLessThan(0.01);
    expect(Math.abs(p.legL)).toBeLessThanOrEqual(0.6 + 1e-9);
  });
});
