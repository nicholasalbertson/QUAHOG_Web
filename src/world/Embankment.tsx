import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Road } from "../slice";
import { buildFreewayCorridor } from "./freeway";

// Graded earth berms beside the freeway corridor — a low (~1.5 m) dark-earth
// strip that makes the motorway read as a raised/graded cut without DEM.
// Uses buildFreewayCorridor segments; both shoulders. Visual only.

const HEIGHT = 1.5;
const WIDTH = 3.2;
/** Lateral offset from motorway centerline to berm center (m). */
const OFFSET = 11;
const CAP = 600;

export interface EmbankmentPiece {
  x: number;
  z: number;
  rot: number;
  len: number;
}

/** Pure placement helper — exported for a cheap unit test. */
export function buildEmbankmentPieces(roads: Road[]): EmbankmentPiece[] {
  const corridor = buildFreewayCorridor(roads);
  const pieces: EmbankmentPiece[] = [];
  for (const [ax, az, bx, bz] of corridor.segments) {
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 2) continue;
    const ux = dx / len, uz = dz / len;
    const nx = -uz, nz = ux;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const rot = Math.atan2(-uz, ux); // local +X along travel (matches MedianBarriers)
    for (const side of [-1, 1] as const) {
      pieces.push({
        x: mx + nx * OFFSET * side,
        z: mz + nz * OFFSET * side,
        rot,
        len,
      });
      if (pieces.length >= CAP) return pieces;
    }
  }
  return pieces.slice(0, CAP);
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export function Embankment({ roads }: { roads: Road[] }) {
  const pieces = useMemo(() => buildEmbankmentPieces(roads), [roads]);
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      _q.setFromAxisAngle(_up, p.rot);
      // Sit the berm on the ground: center at HEIGHT/2.
      _m.compose(_p.set(p.x, HEIGHT / 2, p.z), _q, _s.set(p.len, 1, 1));
      mesh.setMatrixAt(i, _m);
    }
    mesh.count = pieces.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [pieces]);

  if (pieces.length === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, pieces.length)]} castShadow receiveShadow>
      <boxGeometry args={[1, HEIGHT, WIDTH]} />
      <meshStandardMaterial color="#3d3428" roughness={1} />
    </instancedMesh>
  );
}
