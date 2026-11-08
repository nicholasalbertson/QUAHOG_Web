// §1.9.7 / §3.3.6 — Rapier contact wiring (sim/ContactWiring.tsx).
// The contact resolvers are pure functions over the shared traffic state;
// the sfx module is Web Audio, so this test stubs a minimal AudioContext
// (same pattern as sfxSurfaces.test.ts) so the crash voice can run in Node.
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import * as THREE from "three";
import { shared, type TrafficCar } from "../shared";
import {
  impactIntensity,
  resolveTrafficImpact,
  resolveCopImpact,
  registerPoliceCollider,
  unregisterPoliceCollider,
  isPoliceCollider,
  IMPACT_SPEED_THRESHOLD,
  IMPACT_TOP_SPEED,
  TRAFFIC_DAMAGE,
  TRAFFIC_STOP_SECONDS,
} from "../sim/ContactWiring";
import { trafficCarAt } from "../world/StreetLife";
import { useStats } from "../game";

function param() {
  return { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} };
}
function node(): Record<string, unknown> {
  const n: Record<string, unknown> = {
    disconnect: () => {}, start: () => {}, stop: () => {},
    gain: param(), frequency: param(), Q: param(), type: "", buffer: null, loop: false,
  };
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

function car(over: Partial<TrafficCar> = {}): TrafficCar {
  return {
    pos: new THREE.Vector3(10, 0, 20),
    yaw: 0,
    type: "sedan",
    color: "#fff",
    stop: 0,
    stolen: false,
    ...over,
  };
}

const AT = new THREE.Vector3(10, 1, 20);

beforeEach(() => {
  shared.carDamage = 0;
  shared.shake = 0;
  shared.impacts.length = 0;
  shared.alarm.t = 0;
  shared.traffic.length = 0;
  useStats.setState({ police: 0, faction: 0 });
});

describe("§1.9.7 impactIntensity threshold curve", () => {
  it("is 0 at or below the 6 m/s ram gate", () => {
    expect(impactIntensity(0)).toBe(0);
    expect(impactIntensity(6)).toBe(0);
    expect(impactIntensity(-3)).toBe(0);
    expect(IMPACT_SPEED_THRESHOLD).toBe(6);
  });
  it("rises linearly to 1 at top speed (32 m/s)", () => {
    expect(impactIntensity(16)).toBeCloseTo(0.5);
    expect(impactIntensity(32)).toBe(1);
    expect(IMPACT_TOP_SPEED).toBe(32);
  });
  it("clamps above top speed", () => {
    expect(impactIntensity(40)).toBe(1);
    expect(impactIntensity(100)).toBe(1);
  });
});

describe("§1.9.7 resolveTrafficImpact — player car ↔ live traffic car", () => {
  it("fires above the gate with the Car.tsx probe-ram effects (stop 1.6, +11 damage, shake, impact)", () => {
    const tc = car();
    const r = resolveTrafficImpact(tc, 16, AT);
    expect(r).toEqual({ fired: true, intensity: 0.5 });
    expect(tc.stop).toBe(TRAFFIC_STOP_SECONDS);
    expect(shared.carDamage).toBe(TRAFFIC_DAMAGE);
    expect(shared.shake).toBeGreaterThan(0);
    expect(shared.impacts.length).toBe(1);
  });
  it("does not fire at or below the gate", () => {
    const tc = car();
    expect(resolveTrafficImpact(tc, 6, AT).fired).toBe(false);
    expect(resolveTrafficImpact(tc, 0, AT).fired).toBe(false);
    expect(tc.stop).toBe(0);
    expect(shared.carDamage).toBe(0);
  });
  it("dedupes against the Car.tsx probe ram via the stop timer (no double damage)", () => {
    const tc = car();
    // Probe ram fired first: the car is already halted.
    tc.stop = TRAFFIC_STOP_SECONDS;
    const before = shared.carDamage;
    expect(resolveTrafficImpact(tc, 20, AT).fired).toBe(false);
    expect(shared.carDamage).toBe(before);
    // And the reverse: a contact that fired first leaves stop > 0, so a
    // second contact in the same scrape does not fire again.
    const tc2 = car();
    expect(resolveTrafficImpact(tc2, 20, AT).fired).toBe(true);
    const dmgAfterFirst = shared.carDamage;
    expect(resolveTrafficImpact(tc2, 20, AT).fired).toBe(false);
    expect(shared.carDamage).toBe(dmgAfterFirst);
  });
  it("skips stolen cars (their collider is parked underground)", () => {
    const tc = car({ stolen: true });
    expect(resolveTrafficImpact(tc, 20, AT).fired).toBe(false);
    expect(shared.carDamage).toBe(0);
  });
  it("caps damage at 100", () => {
    shared.carDamage = 95;
    resolveTrafficImpact(car(), 20, AT);
    expect(shared.carDamage).toBe(100);
  });
});

describe("trafficCarAt — contact body → StreetLife actor", () => {
  it("returns the nearest live car within the match radius", () => {
    const near = car({ pos: new THREE.Vector3(11, 0, 21) });
    const far = car({ pos: new THREE.Vector3(12, 0, 22) });
    shared.traffic.push(far, near);
    expect(trafficCarAt(10, 20, 2.6)).toBe(near);
  });
  it("returns null when no car is within radius", () => {
    shared.traffic.push(car({ pos: new THREE.Vector3(50, 0, 50) }));
    expect(trafficCarAt(10, 20, 2.6)).toBeNull();
  });
  it("returns null when traffic is empty", () => {
    expect(trafficCarAt(10, 20, 2.6)).toBeNull();
  });
  it("skips stolen cars", () => {
    shared.traffic.push(car({ stolen: true }));
    expect(trafficCarAt(10, 20, 2.6)).toBeNull();
  });
});

describe("§3.3.6 cop↔player contact — inert until police register a collider", () => {
  it("no collider is registered while police are off", () => {
    expect(isPoliceCollider(1)).toBe(false);
    expect(isPoliceCollider(999)).toBe(false);
  });
  it("register / unregister round-trips a police collider handle", () => {
    registerPoliceCollider(42);
    expect(isPoliceCollider(42)).toBe(true);
    unregisterPoliceCollider(42);
    expect(isPoliceCollider(42)).toBe(false);
  });
  it("resolveCopImpact fires above the gate (heat + alarm + crash + damage)", () => {
    const r = resolveCopImpact(16, AT);
    expect(r).toEqual({ fired: true, intensity: 0.5 });
    expect(useStats.getState().police).toBeCloseTo(0.6);
    expect(shared.alarm.t).toBeGreaterThan(0);
    expect(shared.carDamage).toBe(TRAFFIC_DAMAGE);
    expect(shared.shake).toBeGreaterThan(0);
  });
  it("resolveCopImpact does not fire at or below the gate", () => {
    expect(resolveCopImpact(6, AT).fired).toBe(false);
    expect(useStats.getState().police).toBe(0);
    expect(shared.carDamage).toBe(0);
  });
});
