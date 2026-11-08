import { useMemo } from "react";
import { PackGLB } from "../actors/PackGLB";
import type { Road } from "../slice";
import { PACK011 } from "./vendorCatalog";
import { buildFreewayCorridor, FREEWAY_TYPES } from "./freeway";

/**
 * Selective Water St + Johnny Cake Hill furniture only (audit #18/#21).
 * City-wide DRESSING_ENABLED stays false — this is an allowlisted corridor.
 */

const ALLOW_STREETS = ["johnny cake hill", "water street", "n water street", "north water street"];
const CAP = 48;
const RADIUS = 220;

function allowed(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return ALLOW_STREETS.some((s) => n === s || n.startsWith(s + " "));
}

type Spot = { x: number; z: number; rot: number; path: string };

function buildSpots(roads: Road[], center: [number, number]): Spot[] {
  const corridor = buildFreewayCorridor(roads);
  const out: Spot[] = [];
  let n = 0;
  for (const r of roads) {
    if (!allowed(r.name) || FREEWAY_TYPES.has(r.highway) || r.bridge || r.points.length < 2) continue;
    const off = r.width / 2 + 1.3;
    for (let i = 0; i < r.points.length - 1; i++) {
      const [ax, an] = r.points[i];
      const [bx, bn] = r.points[i + 1];
      const x1 = ax, z1 = -an, x2 = bx, z2 = -bn;
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 12) continue;
      const ux = dx / len, uz = dz / len;
      const nx = -uz, nz = ux;
      for (let d = 10; d < len; d += 24) {
        const side = n & 1 ? 1 : -1;
        const x = x1 + ux * d + nx * off * side;
        const z = z1 + uz * d + nz * off * side;
        if (Math.hypot(x - center[0], z - center[1]) > RADIUS) continue;
        if (corridor.contains(x, z)) continue;
        const rot = Math.atan2(nx * side, nz * side);
        const kind = n % 4;
        const path =
          kind === 0 ? PACK011.lamp :
          kind === 1 ? PACK011.hydrant :
          kind === 2 ? PACK011.bench :
          PACK011.trash;
        out.push({ x, z, rot, path });
        n++;
        if (out.length >= CAP) return out;
      }
    }
  }
  return out;
}

/** Allowlisted corridor props — hydrants, benches, lamps on Water St / JCH only. */
export function CorridorDressing({
  roads,
  center,
}: {
  roads: Road[];
  center: [number, number];
}) {
  const spots = useMemo(() => buildSpots(roads, center), [roads, center]);
  return (
    <group name="corridor-dressing">
      {spots.map((s, i) => (
        <group key={`${s.path}-${i}`} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}>
          <PackGLB path={s.path} />
        </group>
      ))}
    </group>
  );
}
