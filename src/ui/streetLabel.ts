// Live street + town label for the HUD (wayfinding spec §B.3, implemented
// 2026-11-07). Pure resolver + hysteresis tracker; the HUD polls it from
// its existing 200 ms interval (every 2nd tick = 400 ms) — no new loop, no
// per-frame work.
//
// Coordinate convention: all geometry is in slice [east, north] metres.
// Callers pass world coords and the module converts (north = -z), matching
// slice.ts `toWorld` (east -> +x, north -> -z).
//
// Honesty rules (spec §B.3): only NAMED roads ever display; unnamed roads
// show nothing (no "UNNAMED STREET"); beyond the radius the HUD shows the
// town alone rather than a wrong guess. Road names come from the shipped
// slice via prepareRoads (SKIP filter + name fixes), never invented.

import type { Road } from "../slice";
import type { DistrictId } from "../districts";

/** Display town per district. The shipped slice data carries no town
 *  boundaries, so district-level is the resolution the data supports —
 *  the Cape slice is Hyannis. (NB's slice also covers slivers of
 *  Dartmouth/Fairhaven, but with no boundary data a landmark-proximity
 *  guess would invent towns; district-level it is.) */
export const DISTRICT_TOWNS: Record<DistrictId, string> = {
  newBedford: "New Bedford",
  fallRiver: "Fall River",
  brockton: "Brockton",
  cape: "Hyannis",
};

export function districtTown(d: DistrictId): string {
  return DISTRICT_TOWNS[d];
}

/** A named road is only displayed this close — beyond it the HUD shows
 *  the town alone. 40 m covers carriageway + sidewalk + adjacent lot
 *  without reaching the next block's streets. */
export const STREET_RADIUS_M = 40;
/** Hysteresis (spec §B.3): switch to a different street only when the
 *  new road is this much nearer, or the current road is this far away —
 *  at junctions this holds the street you are on instead of flickering
 *  between cross streets. */
export const STREET_SWITCH_MARGIN_M = 5;
export const STREET_DROP_M = 25;
/** Skip the scan until the player moved at least this far — a 2 m move
 *  cannot change the nearest road by more than 2 m, so the label cannot
 *  have changed either. */
export const STREET_MOVE_GATE_M = 2;

export interface StreetHit {
  road: Road;
  dist: number;
}

/** Drivable classes first on near-ties (spec §B.3): a footway crossing a
 *  residential street at the same distance must not win the label. */
const CLASS_RANK: Record<string, number> = {
  motorway: 0, motorway_link: 0, trunk: 0, trunk_link: 0, primary: 0,
  primary_link: 0, secondary: 0, secondary_link: 0, tertiary: 0,
  residential: 1, unclassified: 1, living_street: 1,
  service: 2,
  footway: 3, path: 3, pedestrian: 3, cycleway: 3, steps: 3,
};

export function roadClassRank(highway: string): number {
  return CLASS_RANK[highway] ?? 4;
}

function pointSegDist(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distance from a slice point to a whole road (min over its segments). */
export function distanceToRoad(road: Road, east: number, north: number): number {
  let best = Infinity;
  const pts = road.points;
  for (let i = 0; i + 1 < pts.length; i++) {
    const d = pointSegDist(east, north, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}

interface Seg {
  road: Road;
  ax: number; ay: number; bx: number; by: number;
}

/** Uniform-grid index over NAMED-road segments only (unnamed roads can
 *  never display, so they are never indexed — NB drops from 8,138 live
 *  roads to ~4,000 named ones). Cell 128 m; a 40 m query touches at most
 *  2x2 cells, so a scan costs tens of segment checks, not thousands.
 *  Measured on the shipped NB slice (raw 16,167 roads = worst case; the
 *  live list is 8,138 after the SKIP filter): index build ~46 ms once per
 *  district load, a query ~0.05 ms (see streetLabel.test.ts). */
export class StreetIndex {
  private static readonly CELL = 128;
  private readonly cells = new Map<string, number[]>();
  private readonly segs: Seg[] = [];
  readonly roadCount: number;
  readonly segmentCount: number;

  constructor(roads: Road[]) {
    let roadCount = 0;
    for (const road of roads) {
      if (!road.name || road.points.length < 2) continue;
      roadCount++;
      for (let i = 0; i + 1 < road.points.length; i++) {
        const ax = road.points[i][0], ay = road.points[i][1];
        const bx = road.points[i + 1][0], by = road.points[i + 1][1];
        const id = this.segs.length;
        this.segs.push({ road, ax, ay, bx, by });
        const cx0 = Math.floor((Math.min(ax, bx)) / StreetIndex.CELL);
        const cx1 = Math.floor((Math.max(ax, bx)) / StreetIndex.CELL);
        const cy0 = Math.floor((Math.min(ay, by)) / StreetIndex.CELL);
        const cy1 = Math.floor((Math.max(ay, by)) / StreetIndex.CELL);
        for (let cx = cx0; cx <= cx1; cx++) {
          for (let cy = cy0; cy <= cy1; cy++) {
            const key = `${cx},${cy}`;
            const list = this.cells.get(key);
            if (list) list.push(id);
            else this.cells.set(key, [id]);
          }
        }
      }
    }
    this.roadCount = roadCount;
    this.segmentCount = this.segs.length;
  }

  /** Nearest named road within maxDist of a slice point, or null. */
  nearest(east: number, north: number, maxDist = STREET_RADIUS_M): StreetHit | null {
    const cell = StreetIndex.CELL;
    const cx0 = Math.floor((east - maxDist) / cell);
    const cx1 = Math.floor((east + maxDist) / cell);
    const cy0 = Math.floor((north - maxDist) / cell);
    const cy1 = Math.floor((north + maxDist) / cell);
    const seen = new Set<number>();
    const perRoad = new Map<Road, number>();
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const list = this.cells.get(`${cx},${cy}`);
        if (!list) continue;
        for (const id of list) {
          if (seen.has(id)) continue;
          seen.add(id);
          const s = this.segs[id];
          const d = pointSegDist(east, north, s.ax, s.ay, s.bx, s.by);
          if (d > maxDist) continue;
          const prev = perRoad.get(s.road);
          if (prev === undefined || d < prev) perRoad.set(s.road, d);
        }
      }
    }
    if (perRoad.size === 0) return null;
    // Best distance first; roads within 0.5 m of it tie-break on class.
    let minDist = Infinity;
    for (const d of perRoad.values()) if (d < minDist) minDist = d;
    let best: StreetHit | null = null;
    for (const [road, d] of perRoad) {
      if (d > minDist + 0.5) continue;
      if (!best || roadClassRank(road.highway) < roadClassRank(best.road.highway)
        || (roadClassRank(road.highway) === roadClassRank(best.road.highway) && d < best.dist)) {
        best = { road, dist: d };
      }
    }
    return best;
  }
}

/** Stateful label tracker: owns the grid index (rebuilt when the roads
 *  array identity changes, i.e. on district switch) and the hysteresis
 *  that keeps the displayed street stable at junctions. One instance
 *  lives in a HUD ref; update() is cheap enough to call from the HUD
 *  interval. */
export class StreetLabelTracker {
  private index: StreetIndex | null = null;
  private roadsRef: Road[] | null = null;
  private current: StreetHit | null = null;
  private last: { x: number; z: number } | null = null;

  /** World (x, z) in; street name out (null = no named road near). */
  update(roads: Road[], x: number, z: number): string | null {
    if (roads !== this.roadsRef) {
      this.index = new StreetIndex(roads);
      this.roadsRef = roads;
      this.current = null;
      this.last = null;
    }
    if (this.last && Math.hypot(x - this.last.x, z - this.last.z) < STREET_MOVE_GATE_M) {
      return this.current?.road.name ?? null;
    }
    this.last = { x, z };
    const east = x, north = -z;
    const best = this.index!.nearest(east, north);
    if (!best) {
      this.current = null;
      return null;
    }
    if (!this.current) {
      this.current = best;
      return best.road.name;
    }
    if (best.road === this.current.road) {
      this.current = best;
      return best.road.name;
    }
    const curDist = distanceToRoad(this.current.road, east, north);
    if (best.dist < curDist - STREET_SWITCH_MARGIN_M || curDist > STREET_DROP_M) {
      this.current = best;
      return best.road.name;
    }
    this.current = { road: this.current.road, dist: curDist };
    return this.current.road.name;
  }
}
