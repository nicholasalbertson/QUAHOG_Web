import { useMemo, useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld, type Landmark } from "../slice";
import { NB_TIER1_MODELS } from "./nbTier1Models";

// Nearby wayfinding, not a skyline of neon beams. Mission targets and map
// markers retain their existing logic; these labels are visual context only.
// Hide when a tier1 hero mesh already occupies the same footprint (audit #6).

const HERO_XZ = NB_TIER1_MODELS.map((m) => [m.position[0], m.position[2]] as const);
const HERO_HIDE_R = 28;

function nearHeroMesh(x: number, z: number): boolean {
  for (const [hx, hz] of HERO_XZ) {
    if (Math.hypot(x - hx, z - hz) < HERO_HIDE_R) return true;
  }
  return false;
}

function NearbyLabel({ landmark }: { landmark: Landmark }) {
  const root = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const [x, , z] = toWorld(landmark.pos);
  const suppressed = useMemo(() => nearHeroMesh(x, z), [x, z]);
  useFrame(() => {
    if (!root.current) return;
    if (suppressed) {
      root.current.visible = false;
      return;
    }
    root.current.visible = Math.hypot(camera.position.x - x, camera.position.z - z) < (landmark.hero ? 65 : 35);
  });
  return <group ref={root} position={[x, 0, z]}>
    <Billboard position={[0, landmark.hero ? 12 : 7, 0]}>
      <Text fontSize={landmark.hero ? 0.65 : 0.45} color="#ded9c6" outlineWidth={0.025} outlineColor="#273c43" anchorX="center" anchorY="middle">{landmark.name}</Text>
    </Billboard>
  </group>;
}
export function Landmarks({ landmarks }: { landmarks: Landmark[] }) {
  return <group>{landmarks.map((lm, i) => <NearbyLabel key={i} landmark={lm} />)}</group>;
}
