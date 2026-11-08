/**
 * Budgeted pedestrian LOD: near agents update every frame, mid/far less often.
 * Uses SpatialIndex for radius queries (combat / threats).
 * When a PedGraph is bound, agents follow sidewalk routes instead of open wander.
 */

import { SpatialIndex } from "./SpatialIndex";
import type { PedGraph } from "./PedGraph";
import type { Vec2 } from "./types";
import { dist } from "./math";
import { rng } from "./Rng";
import { OccupancyGrid } from "./OccupancyGrid";
import {
  createCrosswalkAgent,
  stepCrosswalk,
  walkWindowFromClock,
  type CrosswalkAgent,
} from "./CrosswalkFsm";

export type PedLod = "near" | "mid" | "far";

export interface PedAgent {
  id: number;
  x: number;
  z: number;
  goalX: number;
  goalZ: number;
  heading: number;
  down: number;
  dead: boolean;
  /** Sidewalk polyline when PedGraph is active. */
  path?: Vec2[] | null;
  pathCursor?: number;
  /** Stuck detection (§1.2.23): last progress sample. */
  stuckX?: number;
  stuckZ?: number;
  /** Time since last progress (for re-path). */
  stuckT?: number;
  /** Cumulative stuck time (for despawn) — not cleared on re-path. */
  stuckTotal?: number;
  /** §1.2.22 Door interaction — TTL while "inside" building. */
  doorTTL?: number;
  doorX?: number;
  doorZ?: number;
  /** §1.2.18 Crosswalk FSM state. */
  crosswalk?: CrosswalkAgent;
}

export interface PedestrianAIOptions {
  nearR?: number;
  midR?: number;
  wander?: number;
  speed?: number;
  midHz?: number;
  farHz?: number;
}

export class PedestrianAI {
  readonly index = new SpatialIndex<PedAgent>({ sectorSize: 32 });
  readonly occupancy = new OccupancyGrid(4);
  private nearR: number;
  private midR: number;
  private wander: number;
  private speed: number;
  private midPeriod: number;
  private farPeriod: number;
  private midAcc = 0;
  private farAcc = 0;
  private center: Vec2 = { x: 0, z: 0 };
  private graph: PedGraph | null = null;
  /** §1.2.19 Stream residency radius (metres); 0 = unlimited. */
  private residencyR = 0;
  private simElapsed = 0;

  constructor(opts: PedestrianAIOptions = {}) {
    this.nearR = opts.nearR ?? 40;
    this.midR = opts.midR ?? 90;
    this.wander = opts.wander ?? 32;
    this.speed = opts.speed ?? 1.5;
    this.midPeriod = 1 / (opts.midHz ?? 8);
    this.farPeriod = 1 / (opts.farHz ?? 3);
  }

  setCenter(c: Vec2): void {
    this.center = c;
  }

  setGraph(g: PedGraph | null): void {
    this.graph = g;
    g?.rebuildCosts({ crowdAt: (x, z) => this.occupancy.countAt(x, z) });
  }

  /** §1.2.19 Tie spawn/despawn to streamer interest radius. */
  setResidencyRadius(r: number): void {
    this.residencyR = Math.max(0, r);
  }

  rebuildIndex(agents: PedAgent[]): void {
    this.index.clear();
    for (const a of agents) {
      if (!a.dead) this.index.insert(a, a.x, a.z);
    }
  }

  lodOf(agent: PedAgent, player: Vec2): PedLod {
    const d = dist(agent.x, agent.z, player.x, player.z);
    if (d <= this.nearR) return "near";
    if (d <= this.midR) return "mid";
    return "far";
  }

  /**
   * Tick wander / sidewalk follow for agents allowed by LOD + budget.
   * Returns how many agents were fully simulated this frame.
   */
  update(
    dt: number,
    player: Vec2,
    agents: PedAgent[],
    budgetMs: number,
    fleeFrom: Vec2 | null,
    now = performance.now(),
  ): number {
    const t0 = now;
    this.midAcc += dt;
    this.farAcc += dt;
    const runMid = this.midAcc >= this.midPeriod;
    const runFar = this.farAcc >= this.farPeriod;
    if (runMid) this.midAcc = 0;
    if (runFar) this.farAcc = 0;

    this.simElapsed += dt;

    // §1.2.15 Occupancy decay + rebuild for active agents.
    this.occupancy.decay(0.8);
    for (const a of agents) {
      if (!a.dead && a.down <= 0 && !(a.doorTTL && a.doorTTL > 0)) this.occupancy.insert(a.x, a.z);
    }
    // Refresh crowd costs periodically (§1.2.13).
    if (this.graph && Math.floor(this.simElapsed * 2) !== Math.floor((this.simElapsed - dt) * 2)) {
      this.graph.rebuildCosts({ crowdAt: (x, z) => this.occupancy.countAt(x, z) });
    }

    let simulated = 0;
    for (const a of agents) {
      if (performance.now() - t0 > budgetMs) break;
      if (a.dead || a.down > 0) continue;

      // §1.2.19 Despawn outside residency ring (streamer-tied).
      if (this.residencyR > 0 && dist(a.x, a.z, this.center.x, this.center.z) > this.residencyR) {
        a.dead = true;
        continue;
      }

      // §1.2.22 Door TTL — invisible until respawn at door.
      if (a.doorTTL != null && a.doorTTL > 0) {
        a.doorTTL -= dt;
        if (a.doorTTL <= 0) {
          a.x = a.doorX ?? a.x;
          a.z = a.doorZ ?? a.z;
          a.doorTTL = 0;
          a.path = null;
          this.assignSidewalkRoute(a);
        }
        simulated++;
        continue;
      }

      const lod = this.lodOf(a, player);
      if (lod === "mid" && !runMid) continue;
      if (lod === "far" && !runFar) continue;

      const step = lod === "near" ? dt : lod === "mid" ? this.midPeriod : this.farPeriod;
      this.stepAgent(a, step, fleeFrom);
      // §1.2.16 Local avoidance from occupancy neighborhood.
      if (lod === "near") {
        const nb = this.occupancy.sampleNeighbors(a.x, a.z, 1);
        if (nb.n > 0) {
          const len = Math.hypot(nb.dx, nb.dz) || 1;
          a.x += (nb.dx / len) * this.speed * 0.35 * step;
          a.z += (nb.dz / len) * this.speed * 0.35 * step;
        }
      }
      this.index.insert(a, a.x, a.z);
      simulated++;
    }
    return simulated;
  }

  private stepAgent(a: PedAgent, dt: number, fleeFrom: Vec2 | null): void {
    // Stuck detection (§1.2.23): no progress > 3s → re-path; total > 10s → despawn.
    {
      const sx = a.stuckX ?? a.x;
      const sz = a.stuckZ ?? a.z;
      if (dist(a.x, a.z, sx, sz) > 0.45) {
        a.stuckX = a.x;
        a.stuckZ = a.z;
        a.stuckT = 0;
        a.stuckTotal = 0;
      } else {
        a.stuckT = (a.stuckT ?? 0) + dt;
        a.stuckTotal = (a.stuckTotal ?? 0) + dt;
        if ((a.stuckTotal ?? 0) > 10) {
          a.dead = true;
          a.path = null;
          return;
        }
        if (a.stuckT > 3) {
          a.path = null;
          a.pathCursor = 0;
          a.stuckT = 0;
          this.assignSidewalkRoute(a);
        }
      }
    }

    if (fleeFrom && dist(a.x, a.z, fleeFrom.x, fleeFrom.z) < 26) {
      let dx = a.x - fleeFrom.x;
      let dz = a.z - fleeFrom.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      a.x += dx * this.speed * 2.2 * dt;
      a.z += dz * this.speed * 2.2 * dt;
      a.heading = Math.atan2(dx, dz);
      // Fleeing leaves the sidewalk briefly; repath when calm.
      a.path = null;
      a.pathCursor = 0;
      return;
    }

    if (this.graph && (!a.path || a.path.length === 0)) {
      this.assignSidewalkRoute(a);
    }

    if (a.path && a.path.length > 0) {
      const cursor = a.pathCursor ?? 0;
      const wp = a.path[Math.min(cursor, a.path.length - 1)];
      a.goalX = wp.x;
      a.goalZ = wp.z;

      // §1.2.18 Crosswalk FSM when near a crosswalk node.
      if (this.graph) {
        const nid = this.graph.nearestNode(a.x, a.z, 6);
        const nk = nid != null ? this.graph.node(nid)?.kind : undefined;
        const atCw = nk === "crosswalk";
        if (!a.crosswalk) a.crosswalk = createCrosswalkAgent();
        const phase = stepCrosswalk(
          a.crosswalk,
          dt,
          atCw,
          walkWindowFromClock(this.simElapsed, a.id * 0.37),
        );
        if (phase === "wait") {
          a.heading = Math.atan2(a.goalX - a.x, a.goalZ - a.z);
          return;
        }
      }

      let dx = a.goalX - a.x;
      let dz = a.goalZ - a.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.7) {
        // §1.2.22 Enter door at path end.
        if (cursor + 1 >= a.path.length) {
          if (this.graph) {
            const endId = this.graph.nearestNode(a.x, a.z, 4);
            if (endId != null && this.graph.node(endId)?.kind === "door") {
              a.doorX = a.x;
              a.doorZ = a.z;
              a.doorTTL = 4 + rng.stream("peds").next() * 8;
              a.path = null;
              return;
            }
          }
          this.assignSidewalkRoute(a);
          return;
        }
        a.pathCursor = cursor + 1;
        return;
      }
      dx /= d;
      dz /= d;
      // §1.2.17 Right-hand walk bias — slight right offset while following.
      const rx = dz * 0.12, rz = -dx * 0.12;
      a.x += (dx + rx) * this.speed * dt;
      a.z += (dz + rz) * this.speed * dt;
      a.heading = Math.atan2(dx, dz);
      return;
    }

    let dx = a.goalX - a.x;
    let dz = a.goalZ - a.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      const g = this.randomInWander();
      a.goalX = g.x;
      a.goalZ = g.z;
      return;
    }
    dx /= d;
    dz /= d;
    a.x += dx * this.speed * dt;
    a.z += dz * this.speed * dt;
    a.heading = Math.atan2(dx, dz);
  }

  private assignSidewalkRoute(a: PedAgent): void {
    const g = this.graph;
    if (!g || g.nodeCount < 2) {
      const p = this.randomInWander();
      a.goalX = p.x;
      a.goalZ = p.z;
      a.path = null;
      a.pathCursor = 0;
      return;
    }
    const start = g.nearestNode(a.x, a.z) ?? g.randomNodeNear(a.x, a.z, 0, 200, "sidewalk");
    // Crosswalk preference bias (#25): prefer sidewalk goals; allow crosswalk rarely.
    const preferSide = rng.stream("peds").next() < 0.82;
    const goal = g.randomNodeNear(a.x, a.z, 18, this.wander * 2.5, preferSide ? "sidewalk" : undefined);
    if (start == null || goal == null || start === goal) {
      const n = g.node(goal ?? start ?? 0);
      if (n) {
        a.goalX = n.x;
        a.goalZ = n.z;
      }
      a.path = null;
      a.pathCursor = 0;
      return;
    }
    const path = g.routeNodes(start, goal);
    if (!path || path.points.length < 2) {
      const n = g.node(goal);
      a.goalX = n?.x ?? a.x;
      a.goalZ = n?.z ?? a.z;
      a.path = null;
      a.pathCursor = 0;
      return;
    }
    a.path = path.points;
    a.pathCursor = 1;
    a.goalX = path.points[1].x;
    a.goalZ = path.points[1].z;
  }

  /** Snap an agent onto the nearest sidewalk node (spawn helper). */
  snapToGraph(a: PedAgent): void {
    const g = this.graph;
    if (!g) return;
    // Prefer sidewalk over crosswalk so spawn isn't mid-street.
    let id = g.nearestNode(a.x, a.z);
    if (id != null) {
      const n0 = g.node(id);
      if (n0 && n0.kind === "crosswalk") {
        const side = g.randomNodeNear(a.x, a.z, 0, 18, "sidewalk");
        if (side != null) id = side;
      }
    }
    if (id == null) {
      id = g.randomNodeNear(this.center.x, this.center.z, 0, 200, "sidewalk")
        ?? g.randomNodeNear(this.center.x, this.center.z, 0, 200);
    }
    if (id == null) return;
    const n = g.node(id)!;
    a.x = n.x;
    a.z = n.z;
    this.assignSidewalkRoute(a);
  }

  queryNear(x: number, z: number, radius: number): PedAgent[] {
    return this.index.queryRadius(x, z, radius, (a) => ({ x: a.x, z: a.z }));
  }

  randomInWander(): Vec2 {
    if (this.graph && this.graph.nodeCount > 0) {
      // Prefer sidewalk nodes over crosswalks so peds almost never idle in the street.
      const id =
        this.graph.randomNodeNear(this.center.x, this.center.z, 0, this.wander * 2, "sidewalk") ??
        this.graph.randomNodeNear(this.center.x, this.center.z, 0, this.wander * 2);
      if (id != null) {
        const n = this.graph.node(id)!;
        return { x: n.x, z: n.z };
      }
    }
    const r = rng.stream("peds");
    return {
      x: this.center.x + (r.next() * 2 - 1) * this.wander,
      z: this.center.z + (r.next() * 2 - 1) * this.wander,
    };
  }
}
