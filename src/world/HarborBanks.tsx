import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Landscape readability WITHOUT DEM: a short riprap/stone bank along the
// harbour water polygon edge (sloping from ~y=0.5 down toward water) plus a
// thin grass/lawn strip inland. Instanced + capped + distance-culled to the
// playable core — NB water only via the Experience mount gate.

const RADIUS = 380;
const ROCK_CAP = 900;
const GRASS_CAP = 450;
const STEP = 5;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

type Piece = { x: number; y: number; z: number; rot: number; sx: number; sy: number; sz: number };

function inRing(e: number, n: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], ni = ring[i][1], xj = ring[j][0], nj = ring[j][1];
    if ((ni > n) !== (nj > n) && e < ((xj - xi) * (n - ni)) / (nj - ni) + xi) inside = !inside;
  }
  return inside;
}

/** Pure placement helper — exported for a cheap unit test. */
export function buildHarborBankPieces(
  polys: [number, number][][],
  center: [number, number],
): { rocks: Piece[]; grass: Piece[] } {
  const rocks: Piece[] = [];
  const grass: Piece[] = [];
  let n = 0;
  for (const ring of polys) {
    if (ring.length < 3) continue;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const ax = a[0], az = -a[1], bx = b[0], bz = -b[1];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 1e-3) continue;
      const ux = dx / len, uz = dz / len;
      const nx = -uz, nz = ux;
      for (let d = 0; d < len; d += STEP) {
        const ex = ax + ux * d, ez = az + uz * d;
        if (Math.hypot(ex - center[0], ez - center[1]) > RADIUS) continue;
        // land = side NOT inside the water ring
        const probeE = ex + nx * 4, probeN = -(ez + nz * 4);
        const land = inRing(probeE, probeN, ring) ? -1 : 1;
        const water = -land;
        const rot = Math.atan2(ux, uz);
        n++;
        // three-layer riprap sloping from ~0.5 down toward water
        for (let layer = 0; layer < 3; layer++) {
          const off = 0.6 + layer * 1.15;
          const jitter = ((n * 17 + layer * 31) % 10) * 0.04 - 0.2;
          const x = ex + nx * water * off + ux * jitter;
          const z = ez + nz * water * off + uz * jitter;
          const y = 0.5 - layer * 0.16 + ((n + layer) % 3) * 0.02;
          rocks.push({
            x, y, z, rot: rot + (((n + layer) % 5) - 2) * 0.15,
            sx: 0.7 + (layer % 2) * 0.25,
            sy: 0.35 + (1 - layer * 0.08),
            sz: 0.55 + ((n + layer) % 3) * 0.12,
          });
          if (rocks.length >= ROCK_CAP) break;
        }
        // grass/lawn strip a few metres inland from the bank crest
        if (n % 2 === 0 && grass.length < GRASS_CAP) {
          const go = 3.2;
          grass.push({
            x: ex + nx * land * go,
            y: 0.32,
            z: ez + nz * land * go,
            rot,
            sx: STEP * 0.95,
            sy: 0.08,
            sz: 2.4,
          });
        }
        if (rocks.length >= ROCK_CAP) break;
      }
      if (rocks.length >= ROCK_CAP) break;
    }
    if (rocks.length >= ROCK_CAP) break;
  }
  return { rocks: rocks.slice(0, ROCK_CAP), grass: grass.slice(0, GRASS_CAP) };
}

export function HarborBanks({
  polys,
  center,
}: {
  polys: [number, number][][];
  center: [number, number];
}) {
  const L = useMemo(() => buildHarborBankPieces(polys, center), [polys, center]);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const grassRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const fill = (mesh: THREE.InstancedMesh | null, ps: Piece[]) => {
      if (!mesh) return;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        _q.setFromAxisAngle(_up, p.rot);
        _m.compose(_p.set(p.x, p.y, p.z), _q, _s.set(p.sx, p.sy, p.sz));
        mesh.setMatrixAt(i, _m);
      }
      mesh.count = ps.length;
      mesh.instanceMatrix.needsUpdate = true;
    };
    fill(rockRef.current, L.rocks);
    fill(grassRef.current, L.grass);
  }, [L]);

  return (
    <group>
      <instancedMesh ref={rockRef} args={[undefined, undefined, Math.max(1, L.rocks.length)]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        {/* Wet riprap sheen toward the waterline (#19). */}
        <meshStandardMaterial color="#5a564e" roughness={0.72} metalness={0.08} flatShading />
      </instancedMesh>
      <instancedMesh ref={grassRef} args={[undefined, undefined, Math.max(1, L.grass.length)]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5f7344" roughness={0.95} />
      </instancedMesh>
    </group>
  );
}
