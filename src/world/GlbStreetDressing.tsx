import { useMemo } from "react";
import { PackGLB } from "../actors/PackGLB";
import type { Road } from "../slice";
import { buildFreewayCorridor, FREEWAY_TYPES } from "./freeway";
import {
  KENNEY,
  PACK011,
  STREET_LAMP_POOL,
  STREET_TREE_POOL,
} from "./vendorCatalog";

/**
 * Places real pack011 + Kenney CC0 GLBs along sidewalks near the playable core.
 * Caps draw count for mobile; procedural Props still fill density when dressing
 * is on. Visual-only (no colliders) — same contract as PackGLB landmarks.
 */

const RADIUS = 180;
const CAP = 96;

type Spot = { x: number; z: number; rot: number; path: string; scale: number };

function buildSpots(roads: Road[], center: [number, number]): Spot[] {
  const corridor = buildFreewayCorridor(roads);
  const out: Spot[] = [];
  let n = 0;
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
      for (let d = 8; d < segLen; d += 28) {
        const cx = x1 + ux * d, cz = z1 + uz * d;
        if (Math.hypot(cx - center[0], cz - center[1]) > RADIUS) continue;
        const side = n & 1 ? 1 : -1;
        const px = cx + nx * off * side;
        const pz = cz + nz * off * side;
        if (corridor.contains(px, pz)) continue;
        const rot = Math.atan2(nx * side, nz * side);
        const kind = n % 8;
        let path: string;
        let scale = 1;
        if (kind === 0 || kind === 4) {
          path = STREET_LAMP_POOL[n % STREET_LAMP_POOL.length];
        } else if (kind === 1 || kind === 5) {
          path = STREET_TREE_POOL[n % STREET_TREE_POOL.length];
          scale = 0.85 + (n % 5) * 0.06;
        } else if (kind === 2) {
          path = PACK011.hydrant;
          scale = 1;
        } else if (kind === 3) {
          path = n % 2 ? PACK011.bench : KENNEY.bench;
        } else if (kind === 6) {
          path = n % 2 ? PACK011.mailbox : PACK011.trash;
        } else {
          path = n % 3 === 0 ? PACK011.stop : n % 3 === 1 ? PACK011.bollard : KENNEY.cone;
          scale = kind === 7 && path === KENNEY.cone ? 1.2 : 1;
        }
        out.push({ x: px, z: pz, rot, path, scale });
        n++;
        if (out.length >= CAP) return out;
      }
    }
  }
  return out;
}

export function GlbStreetDressing({
  roads,
  center,
}: {
  roads: Road[];
  center: [number, number];
}) {
  const spots = useMemo(() => buildSpots(roads, center), [roads, center]);
  return (
    <group name="glb-street-dressing">
      {spots.map((s, i) => (
        <group key={`${s.path}-${i}`} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]} scale={s.scale}>
          <PackGLB path={s.path} />
        </group>
      ))}
    </group>
  );
}

/** Harbor-edge Kenney boats / buoys as visual fill near known marina coords. */
export function GlbHarborDressing({
  points,
}: {
  points: { x: number; z: number; yaw?: number; kind?: "boat" | "sail" | "buoy" | "container" }[];
}) {
  return (
    <group name="glb-harbor-dressing">
      {points.map((p, i) => {
        const path =
          p.kind === "sail"
            ? KENNEY.sail
            : p.kind === "buoy"
              ? KENNEY.buoy
              : p.kind === "container"
                ? KENNEY.container
                : KENNEY.boat;
        return (
          <group key={`h-${i}`} position={[p.x, p.kind === "buoy" ? 0.2 : 0, p.z]} rotation={[0, p.yaw ?? 0, 0]}>
            <PackGLB path={path} />
          </group>
        );
      })}
    </group>
  );
}
