/**
 * §1.9.13 AI drivers share vehicle controller via TrafficDirector.
 */

import { stepVehicleDynamics, type VehicleTuning } from "./VehicleDynamics";
import type { VehicleDynamicsState, VehicleInput } from "./types";

export interface SharedDriverAgent {
  id: string;
  dyn: VehicleDynamicsState;
  x: number;
  z: number;
}

/** Apply one shared dynamics step and integrate pose. */
export function driveShared(
  agent: SharedDriverAgent,
  input: VehicleInput,
  dt: number,
  tuning?: VehicleTuning,
  friction = 1,
): SharedDriverAgent {
  agent.dyn = stepVehicleDynamics(agent.dyn, input, dt, tuning, friction);
  agent.x += Math.sin(agent.dyn.yaw) * agent.dyn.speed * dt;
  agent.z += Math.cos(agent.dyn.yaw) * agent.dyn.speed * dt;
  return agent;
}
