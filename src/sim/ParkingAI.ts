/**
 * §5.5.2–3 Parking AI stub — drive to slot, park, become ped.
 */

export interface ParkingSlot {
  id: string;
  x: number;
  z: number;
  yaw: number;
}

export type ParkPhase = "seek" | "align" | "parked" | "exitPed";

export interface ParkingAgent {
  id: string;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  phase: ParkPhase;
  slot: ParkingSlot;
  t: number;
}

export function createParkingAgent(id: string, x: number, z: number, slot: ParkingSlot): ParkingAgent {
  return { id, x, z, yaw: 0, speed: 6, phase: "seek", slot, t: 0 };
}

export function stepParking(a: ParkingAgent, dt: number): ParkingAgent {
  a.t += dt;
  const dx = a.slot.x - a.x;
  const dz = a.slot.z - a.z;
  const dist = Math.hypot(dx, dz);

  if (a.phase === "seek") {
    a.yaw = Math.atan2(dx, dz);
    a.x += Math.sin(a.yaw) * a.speed * dt;
    a.z += Math.cos(a.yaw) * a.speed * dt;
    if (dist < 4) {
      a.phase = "align";
      a.t = 0;
    }
  } else if (a.phase === "align") {
    let dyaw = a.slot.yaw - a.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    a.yaw += Math.sign(dyaw) * Math.min(Math.abs(dyaw), 2.2 * dt);
    // Creep toward slot while aligning.
    const creep = Math.min(a.speed, Math.max(1.2, dist));
    a.x += (dx / (dist || 1)) * creep * dt;
    a.z += (dz / (dist || 1)) * creep * dt;
    a.speed = Math.max(0, a.speed - dt * 2);
    if (dist < 1.5 || a.t > 4) {
      a.phase = "parked";
      a.speed = 0;
      a.x = a.slot.x;
      a.z = a.slot.z;
      a.yaw = a.slot.yaw;
      a.t = 0;
    }
  } else if (a.phase === "parked") {
    if (a.t > 1.2) a.phase = "exitPed";
  }
  return a;
}
