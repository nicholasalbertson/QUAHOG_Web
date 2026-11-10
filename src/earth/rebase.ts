// Moving the local tangent frame as the player drives.
//
// One east-north-up frame cannot cover the South Coast: the ground falls
// away by about d²/(2R), hundreds of meters at Fall River. When the player
// is far from the anchor we pick a new anchor under them and subtract the
// same shift from every local body, so the car stays near the origin and
// the highways stay drivable.

import { DRIVABLE } from "./follow";
import { anchorIsSliceOrigin, localToLatLon, sliceToFrame, type LatLon } from "./geo";

export const REBASE_DISTANCE_M = 1800;

export interface RebasePlan {
  anchor: LatLon;
  /** Subtract from every local x/z. The player lands on the new origin. */
  shiftX: number;
  shiftZ: number;
}

export function planRebase(anchor: LatLon, x: number, z: number, limit = REBASE_DISTANCE_M): RebasePlan | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  if (Math.hypot(x, z) < limit) return null;
  return { anchor: localToLatLon(anchor, x, z), shiftX: x, shiftZ: z };
}

export interface XZ { x: number; z: number }

export function shiftXZ<T extends XZ>(point: T, shiftX: number, shiftZ: number): T {
  point.x -= shiftX;
  point.z -= shiftZ;
  return point;
}

const shifters = new Set<(shiftX: number, shiftZ: number) => void>();

/** NPCs, routes, and lights register so a rebase moves them with the player. */
export function registerShift(fn: (shiftX: number, shiftZ: number) => void): () => void {
  shifters.add(fn);
  return () => { shifters.delete(fn); };
}

export function shiftLocals(shiftX: number, shiftZ: number): void {
  for (const fn of shifters) fn(shiftX, shiftZ);
}

export interface RoadSpawn {
  x: number;
  z: number;
  heading: number;
}

type RoadLine = {
  highway: string;
  points: [number, number][];
  lanes?: number;
  ref?: string;
  /** OSM node tag when the slice has one. Absent slices are classified from the road class. */
  control?: "signal" | "stop" | "none";
};

/**
 * Closest drivable centerline to the local origin, with a heading along the
 * segment. Used so a teleport lands on a street instead of inside a mesh.
 */
export function nearestRoadSpawn(
  roads: readonly RoadLine[],
  anchor: LatLon,
  aligned: boolean,
  maxDist = 400,
): RoadSpawn | null {
  let best = maxDist;
  let hit: RoadSpawn | null = null;
  for (const road of roads) {
    if (!DRIVABLE.has(road.highway) || road.points.length < 2) continue;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = sliceToFrame(anchor, road.points[i][0], road.points[i][1], aligned);
      const b = sliceToFrame(anchor, road.points[i + 1][0], road.points[i + 1][1], aligned);
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const ab2 = abx * abx + abz * abz;
      const t = ab2 < 1e-6 ? 0 : Math.max(0, Math.min(1, -((a.x * abx + a.z * abz) / ab2)));
      const x = a.x + abx * t;
      const z = a.z + abz * t;
      const d = Math.hypot(x, z);
      if (d < best) {
        best = d;
        hit = { x, z, heading: Math.atan2(abx, abz) };
      }
    }
  }
  return hit;
}

export interface LocalRoute {
  roadIndex: number;
  pts: { x: number; z: number }[];
  total: number;
  highway?: string;
  lanes?: number;
  ref?: string;
  control?: "signal" | "stop" | "none";
}

function routeFrom(
  roads: readonly RoadLine[],
  index: number,
  anchor: LatLon,
  aligned: boolean,
  radius: number,
): LocalRoute | null {
  const road = roads[index];
  if (!road || !DRIVABLE.has(road.highway) || road.points.length < 2) return null;
  const first = road.points[0];
  const last = road.points[road.points.length - 1];
  const a0 = sliceToFrame(anchor, first[0], first[1], aligned);
  const b0 = sliceToFrame(anchor, last[0], last[1], aligned);
  if (Math.hypot(a0.x, a0.z) > radius && Math.hypot(b0.x, b0.z) > radius) return null;
  const pts: { x: number; z: number }[] = [];
  let total = 0;
  for (const [east, north] of road.points) {
    const p = sliceToFrame(anchor, east, north, aligned);
    if (Math.hypot(p.x, p.z) > radius + 400) continue;
    const prev = pts[pts.length - 1];
    if (prev) total += Math.hypot(p.x - prev.x, p.z - prev.z);
    pts.push(p);
  }
  if (pts.length < 2 || total <= 12) return null;
  return {
    roadIndex: index,
    pts,
    total,
    highway: road.highway,
    lanes: road.lanes,
    ref: road.ref,
    control: road.control,
  };
}

/** Drivable roads near the origin, in the active frame. Already-built indexes are skipped. */
export function routesNear(
  roads: readonly RoadLine[],
  anchor: LatLon,
  have: ReadonlySet<number>,
  radius = 2200,
): LocalRoute[] {
  const aligned = anchorIsSliceOrigin(anchor);
  const out: LocalRoute[] = [];
  for (let i = 0; i < roads.length; i++) {
    if (have.has(i)) continue;
    const built = routeFrom(roads, i, anchor, aligned, radius);
    if (built) out.push(built);
  }
  return out;
}

/**
 * Walk `budget` roads from `start` and return only the ones near the anchor.
 * A rebase uses this across frames so a 16k-road city is not rebuilt in one hitch.
 */
export function scanRoutes(
  roads: readonly RoadLine[],
  anchor: LatLon,
  have: ReadonlySet<number>,
  start: number,
  budget = 36,
  radius = 2200,
): { routes: LocalRoute[]; next: number } {
  const n = roads.length;
  if (n === 0 || budget <= 0) return { routes: [], next: 0 };
  const aligned = anchorIsSliceOrigin(anchor);
  let i = ((start % n) + n) % n;
  const out: LocalRoute[] = [];
  for (let stepped = 0; stepped < budget; stepped++) {
    if (!have.has(i)) {
      const built = routeFrom(roads, i, anchor, aligned, radius);
      if (built) out.push(built);
    }
    i = (i + 1) % n;
  }
  return { routes: out, next: i };
}

/** Straight-line guidance in the local frame. Bearing is the yaw delta to the target. */
export function straightGuide(
  px: number,
  pz: number,
  heading: number,
  tx: number,
  tz: number,
): { distanceRemaining: number; bearing: number; wrongWay: boolean } {
  const dx = tx - px;
  const dz = tz - pz;
  const distanceRemaining = Math.hypot(dx, dz);
  let bearing = Math.atan2(dx, dz) - heading;
  while (bearing > Math.PI) bearing -= Math.PI * 2;
  while (bearing < -Math.PI) bearing += Math.PI * 2;
  return { distanceRemaining, bearing, wrongWay: Math.abs(bearing) > Math.PI * 0.6 };
}

export interface LampPoint { x: number; z: number }

/** Lamps from routes already in the local frame. Does not walk the city slice. */
export function lampsFromRoutes(
  routes: readonly { pts: readonly { x: number; z: number }[] }[],
  x: number,
  z: number,
  count: number,
): LampPoint[] {
  const found: LampPoint[] = [];
  for (const route of routes) {
    const step = Math.max(1, Math.floor(route.pts.length / 3));
    for (let i = 0; i < route.pts.length; i += step) {
      const pt = route.pts[i];
      if (Math.hypot(pt.x - x, pt.z - z) < 180) found.push({ x: pt.x, z: pt.z });
    }
  }
  found.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  return found.slice(0, count);
}

/** A few lamp positions along nearby drivable roads, closest first. */
export function lampPoints(
  roads: readonly RoadLine[],
  anchor: LatLon,
  x: number,
  z: number,
  count = 6,
): LampPoint[] {
  const hits: { x: number; z: number; d: number }[] = [];
  for (const road of roads) {
    if (!DRIVABLE.has(road.highway) || road.points.length < 2) continue;
    let prev = sliceToFrame(anchor, road.points[0][0], road.points[0][1], false);
    if (Math.hypot(prev.x - x, prev.z - z) > 1800) continue;
    let acc = 80;
    for (let i = 1; i < road.points.length; i++) {
      const next = sliceToFrame(anchor, road.points[i][0], road.points[i][1], false);
      const seg = Math.hypot(next.x - prev.x, next.z - prev.z);
      acc += seg;
      if (acc >= 70) {
        acc = 0;
        const d = Math.hypot(next.x - x, next.z - z);
        if (d < 150 && d > 8) hits.push({ x: next.x, z: next.z, d });
      }
      prev = next;
    }
  }
  hits.sort((a, b) => a.d - b.d);
  return hits.slice(0, count);
}
