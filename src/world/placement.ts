// Shared placement guards for the dressing cut (2026-11-07, Nic: "far too
// much BS littered everywhere").
//
// Root cause of defect 1: every dressing layer placed items at a fixed
// offset from ONE road's centerline with no check against CROSSING roads —
// so in the downtown grid the offset point from road A lands on road B's
// carriageway. Measured in the NB core (b6a9f9c): 490 of 1,912 dressing
// items (25.6%) sat inside a car-drivable street. These helpers give every
// layer the same two guards:
//   1. buildRoadIndex().inDrivableRoadway(x, z) — is this point inside any
//      drivable carriageway? (NOT footway/pedestrian/cycleway: those are
//      walkable surfaces, not streets a car drives on.)
//   2. roadEndDegrees() / junctionPoints() / trimRoadEndsAtJunctions() —
//      real junctions (3+ road ends at one point) for stoplight placement
//      and for trimming ribbon ends just before the junction (defect 4).
import type { Road } from "../slice";

/** Car-drivable classes. Footway/pedestrian/cycleway/path/steps/service are
 *  walkable or lot surfaces, not streets — an item on them is not "in the
 *  street" for the density complaint. */
export const DRIVABLE_HIGHWAYS = new Set([
  "primary", "secondary", "tertiary", "residential", "unclassified",
  "trunk", "trunk_link", "motorway", "motorway_link", "living_street",
]);

export interface RoadIndex {
  /** True if (x, z) is inside any drivable carriageway (within half-width
   *  + margin of a drivable segment). */
  inDrivableRoadway(x: number, z: number, margin?: number): boolean;
}

interface Seg { x1: number; z1: number; x2: number; z2: number; half: number }

function distToSegment(px: number, pz: number, s: Seg): number {
  const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - s.x1) * dx + (pz - s.z1) * dz) / l2)) : 0;
  return Math.hypot(px - (s.x1 + dx * t), pz - (s.z1 + dz * t));
}

export function buildRoadIndex(roads: Road[]): RoadIndex {
  const CELL = 100;
  const grid = new Map<string, Seg[]>();
  const key = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  for (const r of roads) {
    if (!DRIVABLE_HIGHWAYS.has(r.highway)) continue;
    for (let i = 0; i < r.points.length - 1; i++) {
      const [ax, an] = r.points[i], [bx, bn] = r.points[i + 1];
      const s: Seg = { x1: ax, z1: -an, x2: bx, z2: -bn, half: r.width / 2 };
      const k = key((s.x1 + s.x2) / 2, (s.z1 + s.z2) / 2);
      const arr = grid.get(k);
      if (arr) arr.push(s); else grid.set(k, [s]);
    }
  }
  return {
    inDrivableRoadway(x: number, z: number, margin = 0): boolean {
      const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gz = cz - 1; gz <= cz + 1; gz++) {
          const segs = grid.get(`${gx},${gz}`);
          if (!segs) continue;
          for (const s of segs) {
            if (distToSegment(x, z, s) < s.half + margin) return true;
          }
        }
      }
      return false;
    },
  };
}

// ---------------------------------------------------------------------------
// Junctions: road-end degree per 4 m bucket (same bucketing as Crosswalks,
// so the two detectors agree on what a junction is). Degree >= 3 = a real
// junction; degree 1 = dead end; degree 2 = an OSM way-split continuation
// (mid-street, NOT a junction — trimming there would open gaps in the
// middle of a street).

export function roadEndDegrees(roads: Road[]): Map<string, number> {
  const deg = new Map<string, number>();
  const key = (e: number, n: number) => `${Math.round(e / 4)}_${Math.round(n / 4)}`;
  for (const r of roads) {
    if (!r.points.length) continue;
    const a = r.points[0], b = r.points[r.points.length - 1];
    deg.set(key(a[0], a[1]), (deg.get(key(a[0], a[1])) ?? 0) + 1);
    deg.set(key(b[0], b[1]), (deg.get(key(b[0], b[1])) ?? 0) + 1);
  }
  return deg;
}

export function isJunctionPoint(x: number, z: number, degrees: Map<string, number>): boolean {
  // world z = -northing, so the bucket key uses northing = -z
  return (degrees.get(`${Math.round(x / 4)}_${Math.round(-z / 4)}`) ?? 0) >= 3;
}

export function junctionPoints(roads: Road[]): { x: number; z: number }[] {
  const deg = roadEndDegrees(roads);
  const out: { x: number; z: number }[] = [];
  // Reconstruct one representative point per junction bucket: the first
  // road end that lands in it (bucketed at 4 m, so the representative is
  // within ~3 m of the true junction — good enough for a corner pole).
  const seen = new Set<string>();
  const key = (e: number, n: number) => `${Math.round(e / 4)}_${Math.round(n / 4)}`;
  for (const r of roads) {
    if (!r.points.length) continue;
    for (const p of [r.points[0], r.points[r.points.length - 1]]) {
      const k = key(p[0], p[1]);
      if (seen.has(k) || (deg.get(k) ?? 0) < 3) continue;
      seen.add(k);
      out.push({ x: p[0], z: -p[1] });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Defect 4 (street overshoot): trim each road's ends back by `trim` metres
// where the end is a real junction, so the ribbon + apron + sidewalk end
// just BEFORE the junction instead of running into the crossing street.
// Dead ends and way-split continuations are NEVER trimmed.

export function trimRoadEndsAtJunctions(roads: Road[], trim = 2): Road[] {
  const deg = roadEndDegrees(roads);
  const key = (e: number, n: number) => `${Math.round(e / 4)}_${Math.round(n / 4)}`;
  const isJunction = (p: [number, number]) => (deg.get(key(p[0], p[1])) ?? 0) >= 3;

  // Points from arc-length `d` along the polyline from the start (or from
  // the end when `fromEnd`); null when the polyline is shorter than `d`.
  // Drops every vertex before the cut so a short first segment can't leave
  // a backwards kink behind the new endpoint.
  const trimEnd = (pts: [number, number][], d: number, fromEnd: boolean): [number, number][] | null => {
    const seq = fromEnd ? [...pts].reverse() : pts;
    let remaining = d;
    for (let i = 0; i < seq.length - 1; i++) {
      const [ax, an] = seq[i], [bx, bn] = seq[i + 1];
      const len = Math.hypot(bx - ax, bn - an);
      if (len < 1e-6) continue;
      if (remaining <= len) {
        const t = remaining / len;
        const np: [number, number] = [ax + (bx - ax) * t, an + (bn - an) * t];
        const kept = [np, ...seq.slice(i + 1)];
        return fromEnd ? kept.reverse() as [number, number][] : kept;
      }
      remaining -= len;
    }
    return null;
  };

  return roads.map((r) => {
    if (r.points.length < 2) return r;
    let pts = r.points;
    if (isJunction(pts[0])) {
      const np = trimEnd(pts, trim, false);
      if (np) pts = np;
    }
    if (isJunction(pts[pts.length - 1])) {
      const np = trimEnd(pts, trim, true);
      if (np) pts = np;
    }
    return pts === r.points ? r : { ...r, points: pts };
  });
}
