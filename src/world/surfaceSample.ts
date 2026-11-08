/**
 * §9.1.1 — Surface underfoot sampler for per-surface footsteps.
 *
 * Returns the ClockWeather Surface under a slice position [east, north]:
 * water (inside a water polygon), the nearest road's classified surface
 * when the point is on the carriageway, otherwise grass. Wet asphalt when
 * the caller reports wet weather.
 *
 * Roads come from the caller (the game store slice). A uniform-grid index
 * over road segments is rebuilt only when the roads array identity changes
 * (district switch), so a footstep query is ~0.05 ms. Pure function of
 * (roads, position, wet) — unit-testable with synthetic roads.
 */
import type { Road } from "../slice";
import type { Surface } from "../sim/ClockWeather";
import { classifyRoadSurface } from "./roadSurface";
import { isBlockedWater } from "./waterZones";

const CELL = 128;
/** On-road if within half the road width + this margin (m). */
const ON_ROAD_MARGIN_M = 1.5;
/** Farthest a point can be from a centerline and still count as on-road. */
const MAX_ROAD_DIST_M = 14;

interface Seg {
  road: Road;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

let cachedRoads: readonly Road[] | null = null;
let cells = new Map<string, number[]>();
let segs: Seg[] = [];

function buildIndex(roads: readonly Road[]): void {
  cells = new Map();
  segs = [];
  for (const road of roads) {
    if (road.points.length < 2) continue;
    for (let i = 0; i + 1 < road.points.length; i++) {
      const ax = road.points[i][0];
      const ay = road.points[i][1];
      const bx = road.points[i + 1][0];
      const by = road.points[i + 1][1];
      const id = segs.length;
      segs.push({ road, ax, ay, bx, by });
      const cx0 = Math.floor(Math.min(ax, bx) / CELL);
      const cx1 = Math.floor(Math.max(ax, bx) / CELL);
      const cy0 = Math.floor(Math.min(ay, by) / CELL);
      const cy1 = Math.floor(Math.max(ay, by) / CELL);
      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cy = cy0; cy <= cy1; cy++) {
          const key = `${cx},${cy}`;
          const list = cells.get(key);
          if (list) list.push(id);
          else cells.set(key, [id]);
        }
      }
    }
  }
}

function pointSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Nearest road segment to a slice point, or null beyond MAX_ROAD_DIST_M. */
function nearestRoad(east: number, north: number): { road: Road; dist: number } | null {
  const cx0 = Math.floor((east - MAX_ROAD_DIST_M) / CELL);
  const cx1 = Math.floor((east + MAX_ROAD_DIST_M) / CELL);
  const cy0 = Math.floor((north - MAX_ROAD_DIST_M) / CELL);
  const cy1 = Math.floor((north + MAX_ROAD_DIST_M) / CELL);
  const seen = new Set<number>();
  let best: { road: Road; dist: number } | null = null;
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      const list = cells.get(`${cx},${cy}`);
      if (!list) continue;
      for (const id of list) {
        if (seen.has(id)) continue;
        seen.add(id);
        const s = segs[id];
        const d = pointSegDist(east, north, s.ax, s.ay, s.bx, s.by);
        if (d > MAX_ROAD_DIST_M) continue;
        if (!best || d < best.dist) best = { road: s.road, dist: d };
      }
    }
  }
  return best;
}

/**
 * Surface under a slice position. `wet` = raining / high wetness (asphalt
 * becomes wetAsphalt). `roads` is the active district slice roads; pass null
 * before any slice loads (falls back to asphalt — city streets are the
 * default walking surface).
 */
export function surfaceAt(east: number, north: number, wet: boolean, roads: readonly Road[] | null): Surface {
  // Water first: wading has its own footstep timbre.
  // isBlockedWater takes world coords (wx, wz) = (east, -north).
  if (isBlockedWater(east, -north)) return "water";
  if (!roads || roads.length === 0) return "asphalt";
  if (cachedRoads !== roads) {
    cachedRoads = roads;
    buildIndex(roads);
  }
  const hit = nearestRoad(east, north);
  if (!hit) return "grass";
  const halfWidth = (hit.road.width ?? 6) / 2;
  if (hit.dist > halfWidth + ON_ROAD_MARGIN_M) return "grass";
  const kind = classifyRoadSurface(hit.road);
  switch (kind) {
    case "cobble":
      return "cobble";
    case "dirt":
      return "dirt";
    case "sidewalk":
      return "asphalt";
    case "asphalt":
    default:
      return wet ? "wetAsphalt" : "asphalt";
  }
}
