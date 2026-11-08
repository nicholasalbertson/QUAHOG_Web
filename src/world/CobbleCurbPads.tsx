import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Road } from "../slice";
import { classifyRoadSurface } from "./roadSurface";

/**
 * Thin curb collider pads along real cobble streets (#42).
 * Soft physical lip so Johnny Cake Hill setts aren't frictionless for cars.
 */

const CAP = 36;
const RADIUS = 200;

export function CobbleCurbPads({
  roads,
  center,
}: {
  roads: Road[];
  center: [number, number];
}) {
  const pads = useMemo(() => {
    const out: { x: number; z: number; rot: number; len: number }[] = [];
    for (const r of roads) {
      if (classifyRoadSurface(r) !== "cobble" || r.points.length < 2) continue;
      for (let i = 0; i < r.points.length - 1; i++) {
        const [ax, an] = r.points[i];
        const [bx, bn] = r.points[i + 1];
        const x1 = ax, z1 = -an, x2 = bx, z2 = -bn;
        const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
        if (Math.hypot(mx - center[0], mz - center[1]) > RADIUS) continue;
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.hypot(dx, dz);
        if (len < 4) continue;
        const half = r.width / 2 + 0.35;
        const ux = dx / len, uz = dz / len;
        const nx = -uz, nz = ux;
        for (const side of [-1, 1] as const) {
          out.push({
            x: mx + nx * half * side,
            z: mz + nz * half * side,
            rot: Math.atan2(ux, uz),
            len: Math.min(len, 14),
          });
          if (out.length >= CAP) return out;
        }
      }
    }
    return out;
  }, [roads, center]);

  return (
    <group name="cobble-curb-pads">
      {pads.map((p, i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={[p.x, 0.12, p.z]} rotation={[0, p.rot, 0]}>
          <CuboidCollider args={[0.18, 0.12, p.len / 2]} friction={1.1} />
        </RigidBody>
      ))}
    </group>
  );
}
