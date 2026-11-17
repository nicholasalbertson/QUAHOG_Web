// Intersection control for the photoreal roads.
//
// The baked slices carry highway class, lane count, and route refs. They do
// not carry OSM traffic-signal nodes. A road may still set `control` when a
// future bake has the tag. Otherwise a motorway is free, a primary meeting is
// a signal, and a local street meeting is a stop.

export type ControlKind = "signal" | "stop" | "none";

const FREEWAY = /^(motorway|trunk|motorway_link|trunk_link)/;
const SIGNAL_CLASS = /^(primary|primary_link|secondary|secondary_link)/;

export function isFreeway(highway: string | undefined, ref: string | undefined): boolean {
  if (highway && FREEWAY.test(highway)) return true;
  if (!ref) return false;
  return /(?:^|\b)(I[ -]?195|US[ -]?6|MA[ -]?24|MA[ -]?3|Route[ -]?3)(?:\b|$)/i.test(ref);
}

/** Lane count. A named freeway is at least two lanes even when OSM left it blank. */
export function laneCount(road: { highway?: string; lanes?: number; ref?: string }): number {
  const tagged = road.lanes && road.lanes > 0 ? Math.round(road.lanes) : 0;
  const freeway = isFreeway(road.highway, road.ref);
  const n = Math.max(freeway ? 2 : 1, tagged || (freeway ? 2 : 1));
  return Math.min(4, n);
}

export function controlKind(roads: readonly { highway?: string; ref?: string; control?: ControlKind }[]): ControlKind {
  if (roads.some((road) => road.control === "signal")) return "signal";
  if (roads.some((road) => road.control === "stop")) return "stop";
  if (roads.every((road) => road.control === "none")) return "none";
  if (roads.some((road) => isFreeway(road.highway, road.ref))) return "none";
  if (roads.some((road) => road.highway && SIGNAL_CLASS.test(road.highway))) return "signal";
  return "stop";
}

const GREEN_S = 10;
const YELLOW_S = 2;
const CYCLE_S = (GREEN_S + YELLOW_S) * 2;

/** True when this approach may proceed. Approaches alternate. */
export function signalOpen(junctionId: number, timeS: number, approach: number): boolean {
  const t = ((timeS % CYCLE_S) + CYCLE_S) % CYCLE_S;
  const phase = Math.floor(t / (GREEN_S + YELLOW_S)) % 2;
  const into = t % (GREEN_S + YELLOW_S);
  const mine = (approach & 1) === (phase ^ (junctionId & 1));
  return mine && into < GREEN_S;
}

export interface Junction {
  id: number;
  x: number;
  z: number;
  kind: ControlKind;
}

/** Cluster route endpoints that meet, and classify the junction. */
export function junctionsFromRoutes(
  routes: readonly { pts: readonly { x: number; z: number }[]; highway?: string; ref?: string; control?: ControlKind }[],
  radius = 14,
): Junction[] {
  const ends: { x: number; z: number; route: number }[] = [];
  routes.forEach((route, index) => {
    if (route.pts.length < 2) return;
    ends.push({ x: route.pts[0].x, z: route.pts[0].z, route: index });
    const last = route.pts[route.pts.length - 1];
    ends.push({ x: last.x, z: last.z, route: index });
  });
  const used = new Set<number>();
  const out: Junction[] = [];
  for (let i = 0; i < ends.length; i++) {
    if (used.has(i)) continue;
    const group = [i];
    used.add(i);
    for (let j = i + 1; j < ends.length; j++) {
      if (used.has(j)) continue;
      if (Math.hypot(ends[j].x - ends[i].x, ends[j].z - ends[i].z) <= radius) {
        used.add(j);
        group.push(j);
      }
    }
    if (group.length < 2) continue;
    const members = group.map((n) => routes[ends[n].route]);
    let x = 0;
    let z = 0;
    for (const n of group) { x += ends[n].x; z += ends[n].z; }
    out.push({
      id: out.length,
      x: x / group.length,
      z: z / group.length,
      kind: controlKind(members),
    });
    if (out.length >= 12) break;
  }
  return out;
}

/** Meters to shift a car off the centerline. Lane 0 is the rightmost in this direction. */
export function laneOffset(lane: number, lanes: number, width = 3.2): number {
  const n = Math.max(1, lanes);
  const index = Math.max(0, Math.min(n - 1, lane));
  return (index - (n - 1) / 2) * width;
}

export function laneShift(dirX: number, dirZ: number, offset: number): { x: number; z: number } {
  const len = Math.hypot(dirX, dirZ) || 1;
  return { x: (dirZ / len) * offset, z: (-dirX / len) * offset };
}

export interface PedCar {
  x: number;
  z: number;
  heading: number;
  speed: number;
}

/** A pedestrian waits for a closing car and steps aside when it is on them. */
export function pedReaction(
  ped: { x: number; z: number },
  cars: readonly PedCar[],
): { mode: "walk" | "wait" | "step"; x: number; z: number } {
  let wait = false;
  let stepX = 0;
  let stepZ = 0;
  for (const car of cars) {
    const dx = ped.x - car.x;
    const dz = ped.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 9 || dist < 1e-3) continue;
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const closing = fx * dx + fz * dz;
    if (closing <= 0 || car.speed < 1) continue;
    if (dist < 3.4) {
      stepX += -dz / dist;
      stepZ += dx / dist;
    } else if (dist < 8) wait = true;
  }
  if (Math.hypot(stepX, stepZ) > 0) return { mode: "step", x: stepX, z: stepZ };
  if (wait) return { mode: "wait", x: 0, z: 0 };
  return { mode: "walk", x: 0, z: 0 };
}
