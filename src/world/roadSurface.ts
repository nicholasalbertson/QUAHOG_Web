/**
 * Road surface classification for materials + friction.
 *
 * Cobble is REAL-WORLD ONLY:
 *   1. OSM `surface` tag in {sett, cobblestone, unhewn_cobblestone, paving_stones*}
 *   2. A tiny curated allowlist of streets verified to still carry setts
 *      (Johnny Cake Hill — New Bedford Whaling NHP). No invented downtown cobble.
 *
 * Footways without a cobble surface render as concrete sidewalk, not setts.
 * Unpaved / track → dirt.
 */

import type { Road } from "../slice";
import type { Surface } from "../sim/ClockWeather";

export type RoadSurfaceKind = "asphalt" | "cobble" | "dirt" | "sidewalk";

/** Optional OSM surface tag (slice may omit until rebake). */
export type RoadWithSurface = Road & { surface?: string };

const COBBLE_SURFACE = new Set([
  "sett",
  "cobblestone",
  "unhewn_cobblestone",
  "paving_stones",
  "paving_stones:30",
]);

const DIRT_SURFACE = new Set([
  "dirt",
  "gravel",
  "fine_gravel",
  "ground",
  "earth",
  "compacted",
  "unpaved",
  "mud",
  "sand",
]);

const SIDEWALK_HIGHWAY = new Set([
  "footway",
  "path",
  "pedestrian",
  "steps",
  "cycleway",
]);

/**
 * Streets verified to carry granite setts on the ground today.
 * Keep this list short and evidence-based — do not expand from radio lore.
 */
const VERIFIED_COBBLE_STREETS = [
  "johnny cake hill", // New Bedford Whaling National Historical Park
];

function normalizeSurface(raw?: string | null): string {
  return (raw ?? "").trim().toLowerCase();
}

function verifiedCobbleName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return VERIFIED_COBBLE_STREETS.some((h) => n === h || n.startsWith(h + " "));
}

/** Visual bucket for Roads.tsx ribbons. */
export function classifyRoadSurface(road: RoadWithSurface): RoadSurfaceKind {
  const surf = normalizeSurface(road.surface);

  // Explicit OSM surface wins.
  if (COBBLE_SURFACE.has(surf)) return "cobble";
  if (DIRT_SURFACE.has(surf)) return "dirt";
  if (surf === "concrete" || surf === "paved") {
    return SIDEWALK_HIGHWAY.has(road.highway) ? "sidewalk" : "asphalt";
  }

  // Curated real-world setts (no invented downtown cobble).
  if (verifiedCobbleName(road.name)) return "cobble";

  if (road.highway === "track") return "dirt";
  if (SIDEWALK_HIGHWAY.has(road.highway)) return "sidewalk";

  return "asphalt";
}

/** Map visual kind → ClockWeather Surface for tire friction. */
export function frictionSurfaceForRoad(kind: RoadSurfaceKind): Surface {
  if (kind === "dirt") return "dirt";
  if (kind === "cobble") return "cobble";
  if (kind === "sidewalk") return "asphalt";
  return "asphalt";
}

/**
 * Nearest road under (x,z); returns visual kind + carriageway half-width.
 * Perf: O(segments) — call from a throttled car probe, not every frame.
 */
export function roadSurfaceAt(
  roads: RoadWithSurface[],
  x: number,
  z: number,
): { kind: RoadSurfaceKind; dist: number; halfWidth: number } | null {
  let best: { kind: RoadSurfaceKind; dist: number; halfWidth: number } | null = null;
  for (const r of roads) {
    if (r.points.length < 2) continue;
    for (let i = 0; i < r.points.length - 1; i++) {
      const ax = r.points[i][0];
      const az = -r.points[i][1];
      const bx = r.points[i + 1][0];
      const bz = -r.points[i + 1][1];
      const dx = bx - ax;
      const dz = bz - az;
      const len2 = dx * dx + dz * dz;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2)) : 0;
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      if (!best || d < best.dist) {
        best = { kind: classifyRoadSurface(r), dist: d, halfWidth: r.width / 2 };
      }
    }
  }
  return best;
}
