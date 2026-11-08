// §9.1.6 — every friction Surface has a footstep timbre, and every impact
// accepts an intensity. The sfx module is pure Web Audio; this test stubs a
// minimal AudioContext (no real audio) so the procedural voices can run in
// Node and prove they don't throw for any Surface / intensity.
import { describe, it, expect, beforeAll } from "vitest";
import type { Surface } from "../sim/ClockWeather";

const ALL_SURFACES: Surface[] = [
  "asphalt", "wetAsphalt", "cobble", "dirt", "grass", "sand", "planks", "water",
];

function param() {
  return { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} };
}
function node(): Record<string, unknown> {
  const n: Record<string, unknown> = {
    disconnect: () => {}, start: () => {}, stop: () => {},
    gain: param(), frequency: param(), Q: param(), type: "", buffer: null, loop: false,
  };
  // connect() returns the node so oscillator/filter/gain chains work.
  n.connect = () => n;
  return n;
}

beforeAll(() => {
  class FakeAudioContext {
    currentTime = 0;
    destination = node();
    sampleRate = 44100;
    createGain = () => node();
    createOscillator = () => node();
    createBiquadFilter = () => node();
    createBufferSource = () => node();
    createBuffer = () => ({ getChannelData: () => new Float32Array(44100) });
    resume = async () => {};
  }
  (globalThis as Record<string, unknown>).window = {
    AudioContext: FakeAudioContext,
    addEventListener: () => {},
  };
});

describe("§9.1.6 every surface has a footstep + impact", () => {
  it("step() plays a distinct voice for every Surface without throwing", async () => {
    const { sfx } = await import("../audio/sfx");
    for (const s of ALL_SURFACES) {
      expect(() => sfx.step(s)).not.toThrow();
    }
    // Default (legacy) call still works.
    expect(() => sfx.step()).not.toThrow();
  });

  it("crash()/bump() accept the §1.9.7 intensity curve 0..1", async () => {
    const { sfx } = await import("../audio/sfx");
    for (const k of [0, 0.25, 0.5, 0.75, 1]) {
      expect(() => sfx.crash(k)).not.toThrow();
      expect(() => sfx.bump(k)).not.toThrow();
    }
    // Out-of-range intensities clamp instead of throwing.
    expect(() => sfx.crash(2)).not.toThrow();
    expect(() => sfx.bump(-1)).not.toThrow();
  });

  it("door() + ui() play without throwing", async () => {
    const { sfx } = await import("../audio/sfx");
    expect(() => sfx.door()).not.toThrow();
    expect(() => sfx.ui()).not.toThrow();
  });
});
