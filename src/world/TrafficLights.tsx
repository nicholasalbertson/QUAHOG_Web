import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import type { Road } from "../slice";
import { buildRoadIndex, roadEndDegrees } from "./placement";

// Decorative period traffic signals (§7/§33): mast-arm signal heads at a handful
// of major-road points near the core, cycling red→green→amber on a timer.
//
// Density cut (2026-11-07): lights were placed at each major road record's
// FIRST point — arbitrary OSM way-split points, NOT intersections, with the
// pole ON the centerline (17/17 inside a drivable street). Now only at REAL
// junctions (3+ road ends, a major road incident), with the pole on the
// near-right corner, never in the roadway.

const RADIUS = 210;
const MAX = 16;
const MAJOR = new Set(["primary", "secondary", "tertiary"]);

// Pure position builder, shared with the car's breakable-prop hook so the
// hit test can never disagree with what's drawn (full-game plan item 4:
// signal poles are drivable-through with tiny damage like every other
// pole type — they have no physics colliders).
export function computeTrafficLightPositions(roads: Road[], center: [number, number]): { x: number; z: number; rot: number; phase: number }[] {
  const degrees = roadEndDegrees(roads);
  const roadIndex = buildRoadIndex(roads);
  const key = (e: number, n: number) => `${Math.round(e / 4)}_${Math.round(n / 4)}`;
  // Per junction bucket: the first incident MAJOR road (its junction point,
  // travel direction INTO the junction, width) and the widest half-width of
  // ANY incident road — the pole must clear every carriageway at the corner,
  // not just its own road's.
  const incidents = new Map<string, { major: { x: number; z: number; ux: number; uz: number; w: number } | null; maxHalf: number }>();
  for (const r of roads) {
    if (r.points.length < 2) continue;
    const ends: { e: number; n: number; ux: number; uz: number }[] = [];
    {
      const [ax, an] = r.points[0], [bx, bn] = r.points[1];
      const d1 = Math.hypot(bx - ax, bn - an) || 1;
      ends.push({ e: ax, n: an, ux: (bx - ax) / d1, uz: -(bn - an) / d1 });
    }
    {
      const [cx, cn] = r.points[r.points.length - 2], [dx, dn] = r.points[r.points.length - 1];
      const d2 = Math.hypot(dx - cx, dn - cn) || 1;
      ends.push({ e: dx, n: dn, ux: (dx - cx) / d2, uz: -(dn - cn) / d2 });
    }
    for (const end of ends) {
      const k = key(end.e, end.n);
      const entry = incidents.get(k) ?? { major: null, maxHalf: 0 };
      entry.maxHalf = Math.max(entry.maxHalf, r.width / 2);
      if (MAJOR.has(r.highway) && !entry.major) {
        entry.major = { x: end.e, z: -end.n, ux: end.ux, uz: end.uz, w: r.width };
      }
      incidents.set(k, entry);
    }
  }
  const out: { x: number; z: number; rot: number; phase: number }[] = [];
  let n = 0;
  for (const [k, inc] of incidents) {
    if (!inc.major) continue; // no major road incident — not a signal junction
    if ((degrees.get(k) ?? 0) < 3) continue; // not a real junction
    if (Math.hypot(inc.major.x - center[0], inc.major.z - center[1]) > RADIUS) continue;
    // near-right corner: back along the approach past the widest crossing
    // carriageway + half-width + 1.5 m to the side, so the pole stands on
    // the corner, never in any roadway.
    const back = inc.maxHalf + 1;
    const off = inc.major.w / 2 + 1.5;
    const rx = inc.major.uz, rz = -inc.major.ux; // right normal = (uz, -ux)
    const x = inc.major.x - inc.major.ux * back + rx * off;
    const z = inc.major.z - inc.major.uz * back + rz * off;
    if (roadIndex.inDrivableRoadway(x, z)) continue; // diagonal crossing swallowed the corner
    // world-space road bearing: world z = -northing, so dz = -(bn-an) = an-bn.
    // (must match the car heading atan2(dir.x, dir.z) that redAhead compares to)
    out.push({ x, z, rot: Math.atan2(inc.major.ux, inc.major.uz), phase: (n % 3) * 2.6 });
    if (++n >= MAX) break;
  }
  return out;
}

export function TrafficLights({ roads, center }: { roads: Road[]; center: [number, number] }) {
  const spots = useMemo(() => computeTrafficLightPositions(roads, center), [roads, center]);

  const reds = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const ambers = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const greens = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  // publish stop-lines so traffic can halt at red (§7/§14)
  useEffect(() => {
    shared.stopZones = spots.map((s) => ({ x: s.x, z: s.z, rot: s.rot, red: false }));
    return () => { shared.stopZones = []; };
  }, [spots]);

  useFrame(({ clock }) => {
    spots.forEach((s, i) => {
      const p = (clock.elapsedTime + s.phase) % 7.8; // 4s red, 3s green, 0.8 amber
      const red = p < 4, green = p >= 4 && p < 7, amber = p >= 7;
      if (reds.current[i]) reds.current[i]!.emissiveIntensity = red ? 3 : 0.05;
      if (greens.current[i]) greens.current[i]!.emissiveIntensity = green ? 3 : 0.05;
      if (ambers.current[i]) ambers.current[i]!.emissiveIntensity = amber ? 3 : 0.05;
      // amber counts as "stop if you can" → treat as red for the AI hold
      const z = shared.stopZones[i];
      if (z) z.red = red || amber;
    });
  });

  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation-y={s.rot}>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 5, 6]} />
            <meshStandardMaterial color="#2a2e35" metalness={0.5} roughness={0.6} />
          </mesh>
          <mesh position={[0, 4.8, 0]}>
            <boxGeometry args={[0.34, 1.05, 0.3]} />
            <meshStandardMaterial color="#15181d" />
          </mesh>
          <mesh position={[0, 5.15, 0.17]}><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial ref={(m) => (reds.current[i] = m)} color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={0.05} /></mesh>
          <mesh position={[0, 4.8, 0.17]}><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial ref={(m) => (ambers.current[i] = m)} color="#ffb020" emissive="#ffb020" emissiveIntensity={0.05} /></mesh>
          <mesh position={[0, 4.45, 0.17]}><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial ref={(m) => (greens.current[i] = m)} color="#28d24a" emissive="#28d24a" emissiveIntensity={0.05} /></mesh>
        </group>
      ))}
    </group>
  );
}
