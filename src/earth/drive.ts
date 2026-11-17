// Photoreal driving feel. Uses the shared arcade dynamics (the same model the
// sim layer tests) with street-and-highway tuning: speed-sensitive steering,
// a real coast, a service brake that is firmer than coasting, and a handbrake.
// Wet pavement lengthens the stop and softens the launch.

import { stepVehicleDynamics, type VehicleTuning } from "../sim/VehicleDynamics";
import type { VehicleDynamicsState } from "../sim/types";

export const EARTH_TUNING: VehicleTuning = {
  maxSpeed: 32, // ~72 mph — quick on a South Coast arterial, still readable in tiles
  reverseSpeed: 7.5,
  steerRate: 1.7,
  accelRate: 1.25,
  coastRate: 0.42,
  handbrakeRate: 3.6,
  steerBite: 4.2,
  highSpeedSteer: 0.32,
};

const BRAKE_RATE = 4.4;
const WET_BRAKE_RATE = 2.3;
const WET_GRIP = 0.7;

export interface EarthDriveOpts {
  handbrake: boolean;
  wet: boolean;
  /** 0–1 engine health. Omitted means full power, so older callers stay the same. */
  power?: number;
}

/**
 * One step of the earth car.
 * `axis.y` is throttle (+1 forward, -1 back). Holding back while still
 * rolling forward is a service brake, not an instant reverse gear.
 */
export function stepEarthDrive(
  state: VehicleDynamicsState,
  axis: { x: number; y: number },
  dt: number,
  opts: EarthDriveOpts,
): VehicleDynamicsState {
  const braking = !opts.handbrake && axis.y < -0.15 && state.speed > 1.4;
  const power = opts.power == null ? 1 : Math.max(0, Math.min(1, opts.power));
  const throttle = braking ? 0 : axis.y > 0 ? axis.y * power : axis.y;
  const next = stepVehicleDynamics(
    state,
    {
      steer: axis.x,
      throttle,
      handbrake: opts.handbrake,
    },
    dt,
    EARTH_TUNING,
    opts.wet ? WET_GRIP : 1,
  );
  if (!braking) return next;
  const speed = next.speed * Math.exp(-dt * (opts.wet ? WET_BRAKE_RATE : BRAKE_RATE));
  const skidding = Math.abs(axis.x) > 0.72 && Math.abs(state.speed) > 12;
  return { yaw: next.yaw, speed, skidding: next.skidding || skidding };
}

/** Chase camera stays near street level, where the photogrammetry is sharp.
 *  It lengthens a little with speed. It does not climb onto the roofs. */
export function chaseForSpeed(speed: number): { dist: number; height: number; follow: number; fov: number } {
  const t = Math.min(1, Math.abs(speed) / 28);
  return {
    dist: 6.2 + t * 2.4,
    height: 1.55 + t * 0.45,
    follow: 5.5 - t * 2.2,
    fov: 54 + t * 14,
  };
}

/** Smooth the car onto the tile surface instead of snapping every sample. */
export function suspendHeight(current: number, ground: number, dt: number): number {
  if (!Number.isFinite(ground)) return current;
  const follow = 1 - Math.exp(-Math.max(0, dt) * 10);
  return current + (ground - current) * follow;
}

export function speedMph(metersPerSecond: number): number {
  return Math.round(Math.abs(metersPerSecond) * 2.23694);
}
