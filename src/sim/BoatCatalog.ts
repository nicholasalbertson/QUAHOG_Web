/**
 * §5.3.4 ≥ 3 boats with distinct handling.
 */

import type { VehicleTuning } from "./VehicleDynamics";

export interface BoatDef {
  id: string;
  name: string;
  tuning: VehicleTuning;
  draft: number;
  wake: number;
}

export const BOAT_CATALOG: BoatDef[] = [
  {
    id: "skiff",
    name: "Harbor Skiff",
    draft: 0.4,
    wake: 0.4,
    tuning: {
      maxSpeed: 18,
      reverseSpeed: 6,
      steerRate: 1.6,
      accelRate: 1.4,
      coastRate: 0.8,
      handbrakeRate: 2,
      steerBite: 3,
      highSpeedSteer: 0.7,
    },
  },
  {
    id: "lobster",
    name: "Lobster Boat",
    draft: 0.9,
    wake: 0.8,
    tuning: {
      maxSpeed: 14,
      reverseSpeed: 5,
      steerRate: 1.1,
      accelRate: 1.0,
      coastRate: 0.6,
      handbrakeRate: 1.5,
      steerBite: 4,
      highSpeedSteer: 0.5,
    },
  },
  {
    id: "runabout",
    name: "Fast Runabout",
    draft: 0.35,
    wake: 1.1,
    tuning: {
      maxSpeed: 28,
      reverseSpeed: 8,
      steerRate: 2.2,
      accelRate: 2.4,
      coastRate: 1.0,
      handbrakeRate: 3,
      steerBite: 5,
      highSpeedSteer: 0.45,
    },
  },
];

export function boatById(id: string): BoatDef | undefined {
  return BOAT_CATALOG.find((b) => b.id === id);
}
