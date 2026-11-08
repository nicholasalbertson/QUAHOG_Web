// Night lighting (§7.6): streetlight positions, tiered real-light budget, and
// the dusk-gated window-glow factor shared by the building systems.
//
// The lamp GLBs are placed by GlbStreetDressing (buildSpots, CAP 32, RADIUS
// 150, every 40 m along non-freeway roads, alternating sides). buildLampSpots
// below reproduces that loop's lamp selection exactly (same road iteration,
// same `n` sequencing, lamp when kind 0 or 4) so the lights land on the same
// posts — if GlbStreetDressing.buildSpots changes, this must change with it.
// Head heights are measured from the GLB node transforms (not guessed):
//   historic_pedestrian_lamp → globe node at y 3.2
//   streetlight_cobrahead   → head node at y 7.8
//   kenney light-square     → single mesh, top at y 0.6
import type { Road } from "../slice";
import { buildFreewayCorridor, FREEWAY_TYPES } from "./freeway";
import { buildRoadIndex } from "./placement";
import { STREET_LAMP_POOL } from "./vendorCatalog";
import type { Quality } from "../quality";

export interface LampSpot {
  x: number;
  z: number;
  /** Lamp-head height (m) — where the glow + point light sit. */
  headY: number;
}

export const LAMP_RADIUS = 150;
export const LAMP_CAP = 32;

const HEAD_Y: Record<string, number> = {
  "historic_pedestrian_lamp": 3.2,
  "streetlight_cobrahead": 7.8,
  "light-square": 0.6,
};

function headYFor(path: string): number {
  for (const [key, y] of Object.entries(HEAD_Y)) {
    if (path.includes(key)) return y;
  }
  return 3.2; // unknown lamp model — pedestrian-lamp height is the safe default
}

export function buildLampSpots(roads: Road[], center: [number, number]): LampSpot[] {
  const corridor = buildFreewayCorridor(roads);
  const roadIndex = buildRoadIndex(roads);
  const out: LampSpot[] = [];
  let n = 0;
  // Total spots pushed (all kinds) — the dressing stops at CAP total spots,
  // not CAP lamps, so the lamp set is the lamps among the first 32 spots.
  let total = 0;
  for (const r of roads) {
    if (FREEWAY_TYPES.has(r.highway) || r.bridge || r.points.length < 2) continue;
    const off = r.width / 2 + 1.25;
    for (let i = 0; i < r.points.length - 1; i++) {
      const [ax, an] = r.points[i];
      const [bx, bn] = r.points[i + 1];
      const x1 = ax, z1 = -an, x2 = bx, z2 = -bn;
      const dx = x2 - x1, dz = z2 - z1;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 10) continue;
      const ux = dx / segLen, uz = dz / segLen;
      const nx = -uz, nz = ux;
      for (let d = 8; d < segLen; d += 40) {
        const cx = x1 + ux * d, cz = z1 + uz * d;
        if (Math.hypot(cx - center[0], cz - center[1]) > LAMP_RADIUS) continue;
        const side = n & 1 ? 1 : -1;
        const px = cx + nx * off * side;
        const pz = cz + nz * off * side;
        if (corridor.contains(px, pz)) continue;
        // Advance n on the skip so the side/kind cycle can't lock onto the
        // blocked side (same as GlbStreetDressing).
        if (roadIndex.inDrivableRoadway(px, pz)) { n++; continue; }
        const kind = n % 8;
        if (kind === 0 || kind === 4) {
          const path = STREET_LAMP_POOL[n % STREET_LAMP_POOL.length];
          out.push({ x: px, z: pz, headY: headYFor(path) });
        }
        n++;
        total++;
        if (total >= LAMP_CAP) return out;
      }
    }
  }
  return out;
}

// §7.6.3 — real point-light budget per quality tier. Everything else is
// emissive-only (cheap), so the light count can never exceed the tier cap.
export const LIGHT_BUDGET: Record<Quality, number> = { 0: 0, 1: 4, 2: 8 };

/** The N nearest lamp spots to the player (pure; the point-light pool is
 *  re-targeted to these on a slow tick, not every frame). */
export function nearestLamps(spots: LampSpot[], px: number, pz: number, n: number): LampSpot[] {
  if (n <= 0 || spots.length === 0) return [];
  return [...spots]
    .sort((a, b) => (a.x - px) ** 2 + (a.z - pz) ** 2 - ((b.x - px) ** 2 + (b.z - pz) ** 2))
    .slice(0, n);
}

// §7.6.2 — dusk-gated window glow (shared by Buildings + StreamingBuildings):
// 0 by day, ramps in as the sun drops below 0.3, full at night.
export function windowGlowNight(dayT: number): number {
  const t = Math.min(1, Math.max(0, dayT / 0.3));
  // smoothstep(0, 0.3, dayT) = 3t² − 2t³
  const s = t * t * (3 - 2 * t);
  return 1 - s;
}
