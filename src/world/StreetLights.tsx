// Streetlights (§7.6.1/7.6.3): the GLB lamp posts are placed by
// GlbStreetDressing; this is the LIGHTING layer on the same posts —
//  - an instanced emissive glow at every lamp head (cheap, one draw call),
//    bright at night, dark by day;
//  - a tiered pool of real point lights (low 0 / medium 4 / high 8) that
//    re-targets to the nearest lamps on a slow tick, so the light count can
//    never exceed the tier cap (§7.6.3).
// Gated by DRESSING_ENABLED alongside GlbStreetDressing: without the posts,
// the glows would float.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import { useGame } from "../store";
import type { Road } from "../slice";
import { headlightNightFactor } from "../actors/CarHeadlights";
import { buildLampSpots, LIGHT_BUDGET, nearestLamps } from "./streetLights";

const GLOW_COLOR = "#ffd9a0";
const BEAM_DISTANCE = 18;
const BEAM_DECAY = 1;
const BEAM_PEAK = 5; // decay 1: ~0.5 at 10 m — a readable pool, not a blowout
const RETARGET_S = 0.5;

export function StreetLights({ roads, center }: { roads: Road[]; center: [number, number] }) {
  const quality = useGame((s) => s.quality);
  const spots = useMemo(() => buildLampSpots(roads, center), [roads, center]);
  const budget = LIGHT_BUDGET[quality];
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const glowMat = useRef<THREE.MeshStandardMaterial>(null);
  const lightRefs = useRef<(THREE.PointLight | null)[]>([]);
  const retarget = useRef(0);

  // One matrix per lamp head (set when the spots change, not per frame).
  useLayoutEffect(() => {
    const m = glowRef.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    spots.forEach((s, i) => {
      mat.makeTranslation(s.x, s.headY, s.z);
      m.setMatrixAt(i, mat);
    });
    m.count = spots.length;
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);

  useFrame((state, dt) => {
    const night = headlightNightFactor(shared.dayT);
    if (glowMat.current) glowMat.current.emissiveIntensity = night * 2.2;

    // Re-target the point-light pool to the nearest lamps (slow tick).
    retarget.current += dt;
    if (retarget.current < RETARGET_S) return;
    retarget.current = 0;
    const t = shared.player?.translation() ?? shared.car?.translation();
    if (!t) return;
    const near = nearestLamps(spots, t.x, t.z, budget);
    lightRefs.current.forEach((l, i) => {
      if (!l) return;
      const s = near[i];
      if (!s) { l.intensity = 0; return; }
      l.position.set(s.x, s.headY, s.z);
      l.intensity = night * BEAM_PEAK;
    });
    void state;
  });

  if (spots.length === 0) return null;
  return (
    <group>
      <instancedMesh
        ref={glowRef}
        args={[undefined, undefined, Math.max(spots.length, 1)]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial
          ref={glowMat}
          color={GLOW_COLOR}
          emissive={GLOW_COLOR}
          emissiveIntensity={0}
        />
      </instancedMesh>
      {Array.from({ length: budget }, (_, i) => (
        <pointLight
          key={i}
          ref={(el) => (lightRefs.current[i] = el)}
          color={GLOW_COLOR}
          distance={BEAM_DISTANCE}
          decay={BEAM_DECAY}
          intensity={0}
        />
      ))}
    </group>
  );
}
