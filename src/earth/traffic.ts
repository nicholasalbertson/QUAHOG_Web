// Lane traffic and road-following police. Routes are already in the local frame.
// A car that reaches the end of a road joins another road whose endpoint is
// close, or turns around. A car yields when someone else is closer to that join.

import { laneCount, signalOpen, type ControlKind, type Junction } from "./signals";

export interface PolyPoint { x: number; z: number }
export interface PolyRoute {
  pts: readonly PolyPoint[];
  total: number;
  highway?: string;
  lanes?: number;
  ref?: string;
  control?: ControlKind;
}
export interface LaneState { route: number; dist: number; dir: 1 | -1; hold: number; lane?: number }

function endPoint(route: PolyRoute, dir: 1 | -1): PolyPoint {
  return dir === 1 ? route.pts[route.pts.length - 1] : route.pts[0];
}

function near(a: PolyPoint, b: PolyPoint, radius: number): boolean {
  return Math.hypot(a.x - b.x, a.z - b.z) <= radius;
}

function nearestJunction(point: PolyPoint, junctions: readonly Junction[]): Junction | null {
  let best: Junction | null = null;
  let bestD = 18;
  for (const junction of junctions) {
    const d = Math.hypot(junction.x - point.x, junction.z - point.z);
    if (d < bestD) { best = junction; bestD = d; }
  }
  return best;
}

/** Advance every car. Mutates `cars`. Empty routes leave them where they are. */
export function stepLanes(
  cars: LaneState[],
  routes: readonly PolyRoute[],
  dt: number,
  speed: number,
  now = 0,
  junctions: readonly Junction[] = [],
): void {
  if (!routes.length || dt <= 0) return;
  const snap = cars.map((car) => ({ ...car }));
  const remainAt = snap.map((car) => {
    const route = routes[((car.route % routes.length) + routes.length) % routes.length];
    return route ? route.total - car.dist : Infinity;
  });
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const route = routes[((car.route % routes.length) + routes.length) % routes.length];
    if (!route || route.pts.length < 2 || route.total <= 0) continue;
    if (car.hold > 0) {
      car.hold = Math.max(0, car.hold - dt);
      continue;
    }
    const lanes = laneCount(route);
    car.lane = Math.max(0, Math.min(lanes - 1, car.lane ?? 0));
    if (lanes > 1) {
      const ahead = snap.some((other, j) => {
        if (j === i) return false;
        return other.route === car.route && (other.lane ?? 0) === car.lane && other.dist > car.dist && other.dist - car.dist < 16;
      });
      const occupied = (lane: number) => snap.some((other, j) => j !== i && other.route === car.route && (other.lane ?? 0) === lane && Math.abs(other.dist - car.dist) < 10);
      if (ahead && car.lane > 0 && !occupied(car.lane - 1)) car.lane -= 1;
      else if (ahead && car.lane < lanes - 1 && !occupied(car.lane + 1)) car.lane += 1;
    }
    car.dist += speed * dt;
    const remain = route.total - car.dist;
    const exit = endPoint(route, car.dir);
    const junction = nearestJunction(exit, junctions);
    const kind = junction?.kind ?? route.control;
    if (kind === "stop" && remainAt[i] > 12 && remain <= 12) {
      car.hold = 0.7;
      car.dist = Math.max(0, route.total - 12);
      continue;
    }
    if (kind === "signal" && junction && remain < 16 && !signalOpen(junction.id, now, car.dir === 1 ? 0 : 1)) {
      car.dist = Math.max(0, route.total - 12);
      continue;
    }
    if (remain > 8) continue;
    let blocked = false;
    for (let j = 0; j < cars.length; j++) {
      if (j === i) continue;
      const other = snap[j];
      const otherRoute = routes[((other.route % routes.length) + routes.length) % routes.length];
      if (!otherRoute) continue;
      const otherRemain = remainAt[j];
      if (otherRemain < remainAt[i] && otherRemain < 18 && other.hold <= 0 && near(endPoint(otherRoute, other.dir), exit, 14)) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      car.hold = 0.7;
      car.dist = Math.max(0, route.total - 6);
      continue;
    }
    let joined = -1;
    let joinDir: 1 | -1 = 1;
    const here = ((car.route % routes.length) + routes.length) % routes.length;
    for (let r = 0; r < routes.length; r++) {
      if (r === here) continue;
      const cand = routes[r];
      if (cand.pts.length < 2) continue;
      if (near(cand.pts[0], exit, 14)) { joined = r; joinDir = 1; break; }
      if (near(cand.pts[cand.pts.length - 1], exit, 14)) { joined = r; joinDir = -1; break; }
    }
    if (joined >= 0) {
      car.route = joined;
      car.dir = joinDir;
      car.dist = 0;
    } else {
      car.dir = car.dir === 1 ? -1 : 1;
      car.dist = 0;
    }
  }
}

/** Move along the nearest road toward a target. With no roads, drive straight. */
export function followRoad(
  routes: readonly PolyRoute[],
  x: number,
  z: number,
  _yaw: number,
  tx: number,
  tz: number,
  dt: number,
  speed: number,
): { x: number; z: number; yaw: number } {
  if (!routes.length) {
    const dx = tx - x;
    const dz = tz - z;
    const dist = Math.hypot(dx, dz) || 1;
    const step = Math.min(speed * dt, dist);
    return { x: x + (dx / dist) * step, z: z + (dz / dist) * step, yaw: Math.atan2(dx, dz) };
  }
  let best = Infinity;
  let bx = x;
  let bz = z;
  let routeIndex = 0;
  let seg = 0;
  for (let r = 0; r < routes.length; r++) {
    const pts = routes[r].pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const ab2 = abx * abx + abz * abz;
      const t = ab2 < 1e-6 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / ab2));
      const px = a.x + abx * t;
      const pz = a.z + abz * t;
      const d = (px - x) * (px - x) + (pz - z) * (pz - z);
      if (d < best) { best = d; bx = px; bz = pz; routeIndex = r; seg = i; }
    }
  }
  const pts = routes[routeIndex].pts;
  const ahead = pts[Math.min(pts.length - 1, seg + 1)];
  const behind = pts[Math.max(0, seg)];
  const towardAhead = Math.hypot(ahead.x - tx, ahead.z - tz) <= Math.hypot(behind.x - tx, behind.z - tz);
  const dirx = towardAhead ? ahead.x - bx : behind.x - bx;
  const dirz = towardAhead ? ahead.z - bz : behind.z - bz;
  const len = Math.hypot(dirx, dirz) || 1;
  const step = speed * dt;
  return { x: bx + (dirx / len) * step, z: bz + (dirz / len) * step, yaw: Math.atan2(dirx, dirz) };
}

/** A point on the road ahead of the player, parked across the lane. */
export function roadblockPoint(
  routes: readonly PolyRoute[],
  x: number,
  z: number,
  heading: number,
  ahead = 45,
): { x: number; z: number; yaw: number } | null {
  const ax = x + Math.sin(heading) * ahead;
  const az = z + Math.cos(heading) * ahead;
  let best = 40 * 40;
  let hit: { x: number; z: number } | null = null;
  for (const route of routes) {
    for (const pt of route.pts) {
      const d = (pt.x - ax) * (pt.x - ax) + (pt.z - az) * (pt.z - az);
      if (d < best) { best = d; hit = pt; }
    }
  }
  if (!hit) return null;
  return { x: hit.x, z: hit.z, yaw: heading + Math.PI / 2 };
}
