/**
 * §5.3 Boat dynamics stub — buoyancy + wind-driven bob + sink.
 */

import type { Vec3 } from "./types";

export interface BoatState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  hp: number;
  sunk: boolean;
}

export interface WaveSample {
  height: number;
  /** Surface normal hint. */
  nx: number;
  nz: number;
}

/** §5.3.2 Deterministic wave height from wind + position. */
export function sampleWave(
  x: number,
  z: number,
  t: number,
  wind: Vec3,
): WaveSample {
  const amp = 0.15 + Math.min(0.6, Math.hypot(wind.x, wind.z) * 0.12);
  const h =
    Math.sin(x * 0.08 + t * 1.3) * amp +
    Math.cos(z * 0.06 + t * 0.9) * amp * 0.6;
  return {
    height: h,
    nx: -Math.cos(x * 0.08 + t * 1.3) * amp * 0.08,
    nz: Math.sin(z * 0.06 + t * 0.9) * amp * 0.06,
  };
}

/**
 * §5.3.1 Buoyancy — spring boat deck toward wave surface.
 */
export function stepBoat(
  b: BoatState,
  dt: number,
  input: { throttle: number; steer: number },
  wind: Vec3,
  elapsed: number,
): BoatState {
  if (b.sunk) {
    b.y = Math.max(-4, b.y - dt * 0.4);
    b.speed *= Math.max(0, 1 - dt);
    return b;
  }

  const wave = sampleWave(b.x, b.z, elapsed, wind);
  // Spring to surface.
  const targetY = wave.height;
  b.y += (targetY - b.y) * Math.min(1, dt * 4);

  const thrust = input.throttle * 9;
  b.speed += (thrust - b.speed * 0.8) * dt;
  b.yaw += input.steer * 0.9 * dt * Math.sign(b.speed || 1);
  b.x += Math.sin(b.yaw) * b.speed * dt;
  b.z += Math.cos(b.yaw) * b.speed * dt;
  // Wind drift.
  b.x += wind.x * 0.15 * dt;
  b.z += wind.z * 0.15 * dt;

  if (b.hp <= 0) b.sunk = true;
  return b;
}

export function damageBoat(b: BoatState, amount: number): void {
  b.hp = Math.max(0, b.hp - amount);
  if (b.hp <= 0) b.sunk = true;
}

export function createBoat(x: number, z: number): BoatState {
  return { x, y: 0, z, yaw: 0, speed: 0, hp: 100, sunk: false };
}
