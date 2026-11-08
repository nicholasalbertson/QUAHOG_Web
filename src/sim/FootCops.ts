/**
 * §3.3.1 Foot cops: PedGraph patrol, chase, tackle/arrest (logic stub).
 */

import type { PedGraph } from "./PedGraph";

export type FootCopPhase = "patrol" | "chase" | "tackle" | "arrest";

export interface FootCop {
  id: string;
  x: number;
  z: number;
  phase: FootCopPhase;
  targetId: string | null;
  path: { x: number; z: number }[];
  pathI: number;
  tackleT: number;
}

export function createFootCop(id: string, x: number, z: number): FootCop {
  return { id, x, z, phase: "patrol", targetId: null, path: [], pathI: 0, tackleT: 0 };
}

export function assignPatrol(
  cop: FootCop,
  graph: PedGraph,
  waypoints: { x: number; z: number }[],
): void {
  cop.phase = "patrol";
  cop.targetId = null;
  cop.path = waypoints.slice();
  cop.pathI = 0;
  void graph;
}

export function beginChase(cop: FootCop, targetId: string, path: { x: number; z: number }[]): void {
  cop.phase = "chase";
  cop.targetId = targetId;
  cop.path = path;
  cop.pathI = 0;
}

export function stepFootCop(
  cop: FootCop,
  dt: number,
  player: { x: number; z: number },
  speed = 3.2,
): FootCopPhase {
  if (cop.phase === "arrest") return "arrest";

  if (cop.phase === "tackle") {
    cop.tackleT -= dt;
    if (cop.tackleT <= 0) {
      const d = Math.hypot(player.x - cop.x, player.z - cop.z);
      cop.phase = d < 1.4 ? "arrest" : "chase";
    }
    return cop.phase;
  }

  const goal =
    cop.phase === "chase"
      ? player
      : cop.path[cop.pathI] ?? null;

  if (goal) {
    const dx = goal.x - cop.x;
    const dz = goal.z - cop.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) {
      if (cop.phase === "patrol") cop.pathI = (cop.pathI + 1) % Math.max(1, cop.path.length);
    } else {
      const step = Math.min(d, speed * dt);
      cop.x += (dx / d) * step;
      cop.z += (dz / d) * step;
    }
  }

  if (cop.phase === "chase") {
    const d = Math.hypot(player.x - cop.x, player.z - cop.z);
    if (d < 1.2) {
      cop.phase = "tackle";
      cop.tackleT = 0.6;
    }
  }

  return cop.phase;
}
