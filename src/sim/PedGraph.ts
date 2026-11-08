/**
 * Pedestrian sidewalk graph derived from road centerlines.
 * Offsets each drivcable / footway edge laterally to form walkable corridors,
 * then routes with the same Dijkstra baseline as RoadGraph.
 * Clean-room Mount Hope design — independent of any proprietary ped network.
 */

import type { Road } from "../slice";
import type { NavPath, PedNodeKind, RoadEdge, RoadNode, Vec2 } from "./types";
import { dijkstra, type GraphEdge } from "./Dijkstra";
import { dist } from "./math";
import { rng } from "./Rng";

/** §1.2.14 String-pull smoothing — drop colinear/near-colinear waypoints. */
function stringPull(points: Vec2[], slack = 1.2): Vec2[] {
  if (points.length <= 2) return points;
  const out: Vec2[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const abx = b.x - a.x, abz = b.z - a.z;
    const bcx = c.x - b.x, bcz = c.z - b.z;
    const cross = Math.abs(abx * bcz - abz * bcx);
    const ab = Math.hypot(abx, abz) || 1;
    const bc = Math.hypot(bcx, bcz) || 1;
    // Keep corners; drop nearly-straight midpoints.
    if (cross / (ab * bc) > 0.08 || ab < slack * 0.25) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

const WALKABLE = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "residential",
  "unclassified",
  "living_street",
  "footway",
  "path",
  "pedestrian",
  "steps",
  "service",
]);

export interface PedGraphOptions {
  quantize?: number;
  minEdge?: number;
  /** Extra metres beyond half road width for the sidewalk offset. */
  curb?: number;
  /** §1.2.13 Cost multipliers. */
  crosswalkPenalty?: number;
  doorBonus?: number;
}

export interface PedCostOpts {
  /** Crowd density sampler → penalty multiplier ≥ 1. */
  crowdAt?: (x: number, z: number) => number;
  lanePenalty?: number;
  crosswalkPenalty?: number;
}

export class PedGraph {
  readonly nodes: RoadNode[] = [];
  readonly edges: RoadEdge[] = [];
  private adjacency = new Map<number, GraphEdge[]>();
  /** §1.2.13 Cost-weighted adjacency (length × penalties). */
  private costAdj = new Map<number, GraphEdge[]>();
  private quantize: number;
  private keyToId = new Map<string, number>();
  /** Orphan nodes removed on last build (§1.2.10). */
  orphansPruned = 0;
  private crosswalkPenalty: number;
  private doorBonus: number;

  constructor(opts: PedGraphOptions = {}) {
    this.quantize = opts.quantize ?? 5;
    this.crosswalkPenalty = opts.crosswalkPenalty ?? 1.35;
    this.doorBonus = opts.doorBonus ?? 0.85;
  }

  static fromRoads(roads: Road[], opts?: PedGraphOptions): PedGraph {
    const g = new PedGraph(opts);
    const minEdge = opts?.minEdge ?? 2.5;
    const curb = opts?.curb ?? 1.6;

    for (const road of roads) {
      if (!WALKABLE.has(road.highway) || road.bridge) continue;
      if (road.points.length < 2) continue;

      const isFoot =
        road.highway === "footway" ||
        road.highway === "path" ||
        road.highway === "pedestrian" ||
        road.highway === "steps";
      // Footways sit on the centerline; streets get left/right sidewalks.
      const half = isFoot ? 0 : Math.max(2.2, road.width * 0.5 + curb);
      const sides = isFoot ? [0] : [-half, half];

      for (const side of sides) {
        let prevId = -1;
        let prevX = 0;
        let prevZ = 0;
        for (let i = 0; i < road.points.length; i++) {
          const [e, n] = road.points[i];
          const x0 = e;
          const z0 = -n;
          // Perp from local tangent (prefer forward segment, else back).
          let tx = 0;
          let tz = 0;
          if (i + 1 < road.points.length) {
            tx = road.points[i + 1][0] - e;
            tz = -road.points[i + 1][1] - z0;
          } else {
            tx = e - road.points[i - 1][0];
            tz = z0 - (-road.points[i - 1][1]);
          }
          const tlen = Math.hypot(tx, tz) || 1;
          tx /= tlen;
          tz /= tlen;
          // Perpendicular in XZ: (tx,tz) → (-tz, tx)
          const x = x0 + -tz * side;
          const z = z0 + tx * side;
          const id = g.ensureNode(x, z);
          if (prevId >= 0) {
            const len = dist(prevX, prevZ, x, z);
            if (len >= minEdge) {
              g.addEdge(prevId, id, len);
              g.addEdge(id, prevId, len);
            }
          }
          prevId = id;
          prevX = x;
          prevZ = z;
        }
      }
    }

    // Soft junction stitches: connect near nodes across sides/roads so agents
    // can turn corners without authored crosswalks. Span must cover the
    // sidewalk offset (~half width + curb) at right-angle junctions.
    g.stitchNear(Math.max(12, g.quantize * 2.5));
    // Tag stitch midpoints as crosswalk-ish junctions (§1.2.4).
    g.tagJunctionCrosswalks();
    // §1.2.9 / §1.2.10 — prune tiny orphan components.
    g.orphansPruned = g.pruneOrphans(4);
    return g;
  }

  private ensureNode(x: number, z: number, kind: PedNodeKind = "sidewalk"): number {
    const qx = Math.round(x / this.quantize) * this.quantize;
    const qz = Math.round(z / this.quantize) * this.quantize;
    const key = `${qx},${qz}`;
    const existing = this.keyToId.get(key);
    if (existing !== undefined) {
      const n = this.nodes[existing];
      if (kind === "crosswalk" || kind === "door") n.kind = kind;
      return existing;
    }
    const id = this.nodes.length;
    this.nodes.push({ id, x: qx, z: qz, kind });
    this.keyToId.set(key, id);
    this.adjacency.set(id, []);
    return id;
  }

  /** Mark highly-connected stitch nodes as crosswalks (§1.2.4). */
  private tagJunctionCrosswalks(): void {
    let sig = 0;
    for (const n of this.nodes) {
      const deg = this.adjacency.get(n.id)?.length ?? 0;
      if (deg >= 5) {
        n.kind = "crosswalk";
        // §1.2.5 Metadata placeholder until authored signal ids land.
        n.signalId = n.signalId ?? `auto-sig-${sig++}`;
      }
    }
  }

  /** §1.2.5 Attach signal ids from WorldManifest signals (nearest). */
  bindSignals(signals: { id: string; x: number; z: number }[]): number {
    let bound = 0;
    for (const n of this.nodes) {
      if (n.kind !== "crosswalk") continue;
      let best: string | null = null;
      let bestD = 40 * 40;
      for (const s of signals) {
        const d = (s.x - n.x) ** 2 + (s.z - n.z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = s.id;
        }
      }
      if (best) {
        n.signalId = best;
        bound++;
      }
    }
    return bound;
  }

  /** §1.2.8 Stairs/ramp edge when node y differs. */
  addRampEdge(from: number, to: number, length: number, dy: number): void {
    this.addEdge(from, to, length);
    const e = this.edges[this.edges.length - 1];
    if (e) e.dy = dy;
    const rev = this.edges.find((x) => x.from === to && x.to === from);
    if (rev) rev.dy = -dy;
  }

  /**
   * §1.2.9–10 Connected-component prune: drop components smaller than `minNodes`.
   * Returns orphan count removed.
   */
  pruneOrphans(minNodes = 4): number {
    const seen = new Set<number>();
    const remove = new Set<number>();
    for (const n of this.nodes) {
      if (seen.has(n.id)) continue;
      const stack = [n.id];
      const comp: number[] = [];
      seen.add(n.id);
      while (stack.length) {
        const id = stack.pop()!;
        comp.push(id);
        for (const e of this.adjacency.get(id) ?? []) {
          if (!seen.has(e.to)) {
            seen.add(e.to);
            stack.push(e.to);
          }
        }
      }
      if (comp.length < minNodes) for (const id of comp) remove.add(id);
    }
    if (!remove.size) return 0;
    // Rebuild compact graph without orphans.
    const map = new Map<number, number>();
    const nextNodes: RoadNode[] = [];
    for (const n of this.nodes) {
      if (remove.has(n.id)) continue;
      const nid = nextNodes.length;
      map.set(n.id, nid);
      nextNodes.push({ id: nid, x: n.x, z: n.z, kind: n.kind });
    }
    const nextAdj = new Map<number, GraphEdge[]>();
    const nextEdges: RoadEdge[] = [];
    this.keyToId = new Map();
    for (const n of nextNodes) {
      nextAdj.set(n.id, []);
      this.keyToId.set(`${n.x},${n.z}`, n.id);
    }
    for (const e of this.edges) {
      if (remove.has(e.from) || remove.has(e.to)) continue;
      const a = map.get(e.from)!;
      const b = map.get(e.to)!;
      nextAdj.get(a)!.push({ to: b, weight: e.length });
      nextEdges.push({ from: a, to: b, length: e.length, tag: e.tag });
    }
    const orphaned = remove.size;
    this.nodes.length = 0;
    for (const n of nextNodes) this.nodes.push(n);
    this.edges.length = 0;
    for (const e of nextEdges) this.edges.push(e);
    this.adjacency = nextAdj;
    this.rebuildCosts();
    return orphaned;
  }

  /** Stats for telemetry (§1.2.25). */
  stats(): { nodes: number; edges: number; orphansHint: number } {
    return { nodes: this.nodes.length, edges: this.edges.length, orphansHint: this.orphansPruned };
  }

  /**
   * §1.2.6 Door nodes from building footprints (WorldManifest / GIS).
   * Places a door node at the south-most footprint edge midpoint.
   */
  addDoorNodes(
    buildings: { footprint: [number, number][]; height: number }[],
    limit = 80,
  ): number {
    let added = 0;
    for (const b of buildings) {
      if (added >= limit || b.footprint.length < 3 || b.height < 3) continue;
      let bestI = 0;
      let bestN = Infinity;
      for (let i = 0; i < b.footprint.length; i++) {
        const n = b.footprint[i][1];
        if (n < bestN) {
          bestN = n;
          bestI = i;
        }
      }
      const j = (bestI + 1) % b.footprint.length;
      const [e0, n0] = b.footprint[bestI];
      const [e1, n1] = b.footprint[j];
      const x = (e0 + e1) / 2;
      const z = -((n0 + n1) / 2);
      const id = this.ensureNode(x, z, "door");
      // Link door to nearest sidewalk within 14 m.
      const side = this.nearestNode(x, z, 14);
      if (side != null && side !== id) {
        const sn = this.nodes[side];
        const len = Math.hypot(sn.x - x, sn.z - z) || 1;
        this.addEdge(id, side, len);
        this.addEdge(side, id, len);
      }
      added++;
    }
    return added;
  }

  private addEdge(from: number, to: number, length: number): void {
    if (from === to) return;
    const list = this.adjacency.get(from)!;
    if (list.some((e) => e.to === to)) return;
    list.push({ to, weight: length });
    this.edges.push({ from, to, length });
    this.rebuildEdgeCost(from, to, length);
  }

  /**
   * §1.2.13 Cost model: length × lanePenalty × crosswalkPenalty × crowdPenalty.
   * Call after occupancy updates when crowd-aware routing is desired.
   */
  rebuildCosts(opts: PedCostOpts = {}): void {
    const lane = opts.lanePenalty ?? 1;
    const cw = opts.crosswalkPenalty ?? this.crosswalkPenalty;
    this.costAdj = new Map();
    for (const n of this.nodes) this.costAdj.set(n.id, []);
    for (const e of this.edges) {
      const toN = this.nodes[e.to];
      let w = e.length * lane;
      const kind = toN?.kind ?? "sidewalk";
      if (kind === "crosswalk") w *= cw;
      if (kind === "door") w *= this.doorBonus;
      if (opts.crowdAt && toN) {
        const dens = opts.crowdAt(toN.x, toN.z);
        w *= 1 + Math.min(3, dens) * 0.25;
      }
      this.costAdj.get(e.from)!.push({ to: e.to, weight: w });
    }
  }

  private rebuildEdgeCost(from: number, to: number, length: number): void {
    if (!this.costAdj.has(from)) this.costAdj.set(from, []);
    const toN = this.nodes[to];
    let w = length;
    const kind = toN?.kind ?? "sidewalk";
    if (kind === "crosswalk") w *= this.crosswalkPenalty;
    if (kind === "door") w *= this.doorBonus;
    const list = this.costAdj.get(from)!;
    const existing = list.find((e) => e.to === to);
    if (existing) existing.weight = w;
    else list.push({ to, weight: w });
  }

  private stitchNear(maxDist: number): void {
    // Bucket by quantize so junction stitching stays O(n) instead of O(n²).
    const cell = Math.max(this.quantize, maxDist);
    const buckets = new Map<string, number[]>();
    for (const n of this.nodes) {
      const kx = Math.floor(n.x / cell);
      const kz = Math.floor(n.z / cell);
      const key = `${kx},${kz}`;
      let list = buckets.get(key);
      if (!list) {
        list = [];
        buckets.set(key, list);
      }
      list.push(n.id);
    }
    const max2 = maxDist * maxDist;
    for (const n of this.nodes) {
      const kx = Math.floor(n.x / cell);
      const kz = Math.floor(n.z / cell);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = buckets.get(`${kx + dx},${kz + dz}`);
          if (!list) continue;
          for (const oid of list) {
            if (oid <= n.id) continue;
            const o = this.nodes[oid];
            const d2 = (n.x - o.x) * (n.x - o.x) + (n.z - o.z) * (n.z - o.z);
            if (d2 > 0 && d2 <= max2) {
              const len = Math.sqrt(d2);
              this.addEdge(n.id, o.id, len);
              this.addEdge(o.id, n.id, len);
            }
          }
        }
      }
    }
  }

  nearestNode(x: number, z: number, maxDist = 60): number | null {
    let best = -1;
    let bestD = maxDist * maxDist;
    for (const n of this.nodes) {
      const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (d < bestD) {
        bestD = d;
        best = n.id;
      }
    }
    return best >= 0 ? best : null;
  }

  randomNodeNear(
    x: number,
    z: number,
    minR = 12,
    maxR = 90,
    preferKind?: PedNodeKind,
  ): number | null {
    if (this.nodes.length === 0) return null;
    const min2 = minR * minR;
    const max2 = maxR * maxR;
    const hits: number[] = [];
    const preferred: number[] = [];
    for (const n of this.nodes) {
      const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (d < min2 || d > max2) continue;
      hits.push(n.id);
      if (preferKind && (n.kind ?? "sidewalk") === preferKind) preferred.push(n.id);
    }
    const pool = preferred.length ? preferred : hits;
    if (pool.length === 0) {
      const deg = this.nodes.filter((n) => {
        if ((this.adjacency.get(n.id)?.length ?? 0) === 0) return false;
        if (preferKind) return (n.kind ?? "sidewalk") === preferKind;
        return true;
      });
      const fallback = deg.length ? deg : this.nodes;
      return rng.stream("peds").pick(fallback).id;
    }
    return rng.stream("peds").pick(pool);
  }

  neighbors(id: number): readonly GraphEdge[] {
    return this.adjacency.get(id) ?? [];
  }

  node(id: number): RoadNode | undefined {
    return this.nodes[id];
  }

  route(fromX: number, fromZ: number, toX: number, toZ: number): NavPath | null {
    const start = this.nearestNode(fromX, fromZ);
    const goal = this.nearestNode(toX, toZ);
    if (start == null || goal == null) return null;
    return this.routeNodes(start, goal);
  }

  routeNodes(start: number, goal: number): NavPath | null {
    // Prefer cost-weighted graph (§1.2.13); fall back to geometric length.
    if (this.costAdj.size === 0) this.rebuildCosts();
    const result = dijkstra(this.costAdj.size ? this.costAdj : this.adjacency, start, goal);
    if (!result) return null;
    const points: Vec2[] = result.nodes.map((id) => {
      const n = this.nodes[id];
      return { x: n.x, z: n.z };
    });
    // §1.2.14 Path smoothing: string-pulling within a small corridor.
    const smooth = stringPull(points, 1.2);
    let length = 0;
    for (let i = 1; i < smooth.length; i++) length += dist(smooth[i - 1].x, smooth[i - 1].z, smooth[i].x, smooth[i].z);
    return { nodes: result.nodes, points: smooth, length: length || result.cost };
  }

  get nodeCount(): number {
    return this.nodes.length;
  }

  get edgeCount(): number {
    return this.edges.length;
  }
}
