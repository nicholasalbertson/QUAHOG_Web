/**
 * Pedestrian sidewalk graph derived from road centerlines.
 * Offsets each drivcable / footway edge laterally to form walkable corridors,
 * then routes with the same Dijkstra baseline as RoadGraph.
 * Clean-room Mount Hope design — independent of any proprietary ped network.
 */

import type { Landmark, Road } from "../slice";
import type { NavPath, PedEdgeTag, PedNodeKind, RoadEdge, RoadNode, Vec2 } from "./types";
import { dijkstra, type GraphEdge } from "./Dijkstra";
import { dist } from "./math";

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
}

export class PedGraph {
  readonly nodes: RoadNode[] = [];
  readonly edges: RoadEdge[] = [];
  private adjacency = new Map<number, GraphEdge[]>();
  private quantize: number;
  private keyToId = new Map<string, number>();

  constructor(opts: PedGraphOptions = {}) {
    this.quantize = opts.quantize ?? 5;
  }

  static fromRoads(roads: Road[], opts?: PedGraphOptions): PedGraph {
    const g = new PedGraph(opts);
    const minEdge = opts?.minEdge ?? 2.5;
    const curb = opts?.curb ?? 1.6;
    /** Opposite-side sidewalk pairs at the same centerline vertex → crosswalk. */
    const crossPairs: [number, number][] = [];

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

      const sidePrev: { id: number; x: number; z: number }[] = sides.map(() => ({
        id: -1,
        x: 0,
        z: 0,
      }));

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

        const idsAtPoint: number[] = [];
        for (let s = 0; s < sides.length; s++) {
          const side = sides[s];
          const x = x0 + -tz * side;
          const z = z0 + tx * side;
          const id = g.ensureNode(x, z, "sidewalk");
          idsAtPoint.push(id);
          const prev = sidePrev[s];
          if (prev.id >= 0) {
            const len = dist(prev.x, prev.z, x, z);
            if (len >= minEdge) {
              g.addEdge(prev.id, id, len, "sidewalk");
              g.addEdge(id, prev.id, len, "sidewalk");
            }
          }
          prev.id = id;
          prev.x = x;
          prev.z = z;
        }
        if (idsAtPoint.length === 2) crossPairs.push([idsAtPoint[0], idsAtPoint[1]]);
      }
    }

    // Soft junction stitches: connect near nodes across sides/roads so agents
    // can turn corners without authored crosswalks. Span must cover the
    // sidewalk offset (~half width + curb) at right-angle junctions.
    g.stitchNear(Math.max(12, g.quantize * 2.5));
    // Explicit opposite-side stitches at quantized junctions.
    g.stitchCrosswalks(crossPairs);
    return g;
  }

  /** Tag opposite-side sidewalk pairs as crosswalk edges/nodes. */
  stitchCrosswalks(pairs: [number, number][]): void {
    for (const [a, b] of pairs) {
      if (a === b) continue;
      const na = this.nodes[a];
      const nb = this.nodes[b];
      if (!na || !nb) continue;
      const len = dist(na.x, na.z, nb.x, nb.z);
      if (len < 0.5 || len > 28) continue;
      this.addEdge(a, b, len, "crosswalk");
      this.addEdge(b, a, len, "crosswalk");
      if (na.kind !== "door") na.kind = "crosswalk";
      if (nb.kind !== "door") nb.kind = "crosswalk";
    }
  }

  /**
   * Create door nodes near landmark positions (slice [east, north]) and
   * link each to the nearest sidewalk node so peds can enter/exit buildings.
   */
  addDoorNodes(landmarks: Landmark[] | { pos: [number, number] }[]): number {
    let added = 0;
    for (const lm of landmarks) {
      const x = lm.pos[0];
      const z = -lm.pos[1];
      // Nudge slightly toward the nearest sidewalk so the door sits off the facade.
      const near = this.nearestNode(x, z, 80);
      let dx = 0;
      let dz = 0;
      if (near != null) {
        const n = this.nodes[near];
        const len = dist(x, z, n.x, n.z) || 1;
        dx = ((n.x - x) / len) * 2.5;
        dz = ((n.z - z) / len) * 2.5;
      }
      // Force a unique door key so we don't collide with an existing sidewalk cell.
      const id = this.ensureNode(x + dx + 0.01, z + dz + 0.01, "door");
      this.nodes[id].kind = "door";
      // Prefer linking to a non-door sidewalk/crosswalk node.
      let link: number | null = null;
      let best = 80 * 80;
      for (const n of this.nodes) {
        if (n.id === id || n.kind === "door") continue;
        const d2 = (n.x - this.nodes[id].x) ** 2 + (n.z - this.nodes[id].z) ** 2;
        if (d2 < best) {
          best = d2;
          link = n.id;
        }
      }
      if (link != null) {
        const n = this.nodes[link];
        const len = dist(this.nodes[id].x, this.nodes[id].z, n.x, n.z);
        if (len > 0.25) {
          this.addEdge(id, link, len, "door");
          this.addEdge(link, id, len, "door");
          added++;
        }
      }
    }
    return added;
  }

  private ensureNode(x: number, z: number, kind: PedNodeKind = "sidewalk"): number {
    const qx = Math.round(x / this.quantize) * this.quantize;
    const qz = Math.round(z / this.quantize) * this.quantize;
    const key = `${qx},${qz}`;
    const existing = this.keyToId.get(key);
    if (existing !== undefined) {
      // Don't downgrade a crosswalk/door node back to sidewalk.
      const n = this.nodes[existing];
      if (kind === "door") n.kind = "door";
      else if (kind === "crosswalk" && n.kind !== "door") n.kind = "crosswalk";
      return existing;
    }
    const id = this.nodes.length;
    this.nodes.push({ id, x: qx, z: qz, kind });
    this.keyToId.set(key, id);
    this.adjacency.set(id, []);
    return id;
  }

  private addEdge(from: number, to: number, length: number, tag: PedEdgeTag = "sidewalk"): void {
    if (from === to) return;
    const list = this.adjacency.get(from)!;
    const existing = list.find((e) => e.to === to);
    if (existing) {
      // Upgrade sidewalk → crosswalk/door so stitchNear doesn't erase tags.
      if (tag !== "sidewalk") {
        const edge = this.edges.find((e) => e.from === from && e.to === to);
        if (edge && edge.tag === "sidewalk") edge.tag = tag;
      }
      return;
    }
    list.push({ to, weight: length });
    this.edges.push({ from, to, length, tag });
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
              this.addEdge(n.id, o.id, len, "sidewalk");
              this.addEdge(o.id, n.id, len, "sidewalk");
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

  randomNodeNear(x: number, z: number, minR = 12, maxR = 90): number | null {
    if (this.nodes.length === 0) return null;
    const min2 = minR * minR;
    const max2 = maxR * maxR;
    const hits: number[] = [];
    for (const n of this.nodes) {
      const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (d >= min2 && d <= max2) hits.push(n.id);
    }
    if (hits.length === 0) {
      const deg = this.nodes.filter((n) => (this.adjacency.get(n.id)?.length ?? 0) > 0);
      const pool = deg.length ? deg : this.nodes;
      return pool[Math.floor(Math.random() * pool.length)].id;
    }
    return hits[Math.floor(Math.random() * hits.length)];
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
    const result = dijkstra(this.adjacency, start, goal);
    if (!result) return null;
    const points: Vec2[] = result.nodes.map((id) => {
      const n = this.nodes[id];
      return { x: n.x, z: n.z };
    });
    return { nodes: result.nodes, points, length: result.cost };
  }

  get nodeCount(): number {
    return this.nodes.length;
  }

  get edgeCount(): number {
    return this.edges.length;
  }

  get crosswalkCount(): number {
    return this.edges.filter((e) => e.tag === "crosswalk").length;
  }

  get doorCount(): number {
    return this.nodes.filter((n) => n.kind === "door").length;
  }
}
