import { useMemo } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { makeGroundTexture, makeTerrainTexture } from "./textures";
import { REGION_CENTER, REGION_SIZE } from "./corridor";

// Region-wide land base. The visual plane sits at y=0 and the collider top is at
// y=0, so roads (0.05–0.08) and water (0.45) sit cleanly ABOVE it — otherwise
// they z-fight the ground and flicker.
// Corridor phase 1 (2026-11-07): the plane spans REGION_BOUNDS (see
// world/corridor.ts) — the old +-30,000 box UNION the district bounds UNION
// the corridor strips. The old box alone left the Brockton + Cape fast-travel
// spawns outside the ground, which is why the Nov 7 playtest fell through
// the ground there. The texture repeats at ~50 m/tile, as before.
const [CENTER_X, CENTER_Z] = REGION_CENTER;
const [SIZE_X, SIZE_Z] = REGION_SIZE;
/** Urban core plate under Johnny Cake Hill when Esri aerial tiles fail/abort. */
const CORE = 1800;

export function Ground() {
  const tex = useMemo(() => {
    const t = makeTerrainTexture();
    t.repeat.set(SIZE_X / 50, SIZE_Z / 50); // ~50 m per tile across the region
    return t;
  }, []);
  const urban = useMemo(() => {
    const t = makeGroundTexture();
    t.repeat.set(90, 90); // ~20 m paving grid across the NB core
    return t;
  }, []);

  return (
    <RigidBody type="fixed">
      <CuboidCollider args={[SIZE_X / 2, 0.1, SIZE_Z / 2]} position={[CENTER_X, -0.1, CENTER_Z]} friction={1} />
      {/* visual sits just below y=0 so the aerial drape (y=0.03) and roads win
          the depth test cleanly instead of fighting this region-wide plane */}
      <mesh rotation-x={-Math.PI / 2} position={[CENTER_X, -0.15, CENTER_Z]} receiveShadow>
        <planeGeometry args={[SIZE_X, SIZE_Z]} />
        <meshStandardMaterial map={tex} color="#919a72" roughness={1} />
      </mesh>
      {/* Stronger local fallback when aerial is blocked/offline — reads as
          paved verge instead of one giant meadow under Bethel review cams. */}
      <mesh rotation-x={-Math.PI / 2} position={[-266, -0.12, 100]} receiveShadow>
        <planeGeometry args={[CORE, CORE]} />
        <meshStandardMaterial map={urban} color="#6a6e76" roughness={0.96} />
      </mesh>
    </RigidBody>
  );
}
