/**
 * §13.2 Cop / traffic reaction to corpses.
 */

import type { Corpse } from "./CorpseTtl";

export type CopReaction = "ignore" | "investigate" | "backup";
export type TrafficReaction = "ignore" | "steer_away" | "slow";

export function copReactionToCorpse(
  cop: { x: number; z: number },
  corpses: readonly Corpse[],
  radius = 28,
): { reaction: CopReaction; corpse: Corpse | null } {
  let best: Corpse | null = null;
  let bestD = radius * radius;
  for (const c of corpses) {
    const d = (c.x - cop.x) ** 2 + (c.z - cop.z) ** 2;
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  if (!best) return { reaction: "ignore", corpse: null };
  if (best.kind === "cop") return { reaction: "backup", corpse: best };
  return { reaction: "investigate", corpse: best };
}

export function trafficReactionToCorpse(
  car: { x: number; z: number; yaw: number },
  corpses: readonly Corpse[],
  radius = 18,
): { reaction: TrafficReaction; steer: number; throttleMul: number } {
  let near: Corpse | null = null;
  let bestD = radius * radius;
  for (const c of corpses) {
    const d = (c.x - car.x) ** 2 + (c.z - car.z) ** 2;
    if (d < bestD) {
      near = c;
      bestD = d;
    }
  }
  if (!near) return { reaction: "ignore", steer: 0, throttleMul: 1 };
  const bearing = Math.atan2(near.x - car.x, near.z - car.z);
  const delta = ((bearing - car.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  // Steer away from corpse.
  const steer = delta > 0 ? -0.6 : 0.6;
  return { reaction: Math.sqrt(bestD) < 8 ? "slow" : "steer_away", steer, throttleMul: Math.sqrt(bestD) < 8 ? 0.35 : 0.7 };
}
