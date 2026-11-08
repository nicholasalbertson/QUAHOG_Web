/**
 * Soft contact shadows under the player/car — grounds characters on asphalt
 * that N8AO alone under-sells at street scale.
 */
import { useRef } from "react";
import type * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { shared } from "../shared";
import { useGame } from "../store";

export function ContactGroundShadows() {
  const quality = useGame((s) => s.quality);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (quality < 1 || !group.current) return;
    const body = useGame.getState().mode === "car" ? shared.car : shared.player;
    const t = body?.translation();
    if (!t) return;
    group.current.position.set(t.x, 0.02, t.z);
  });
  if (quality < 1) return null;
  return (
    <group ref={group}>
      <ContactShadows
        frames={quality === 2 ? 24 : 12}
        opacity={0.42}
        scale={quality === 2 ? 14 : 10}
        blur={2.4}
        far={6}
        resolution={quality === 2 ? 512 : 256}
        color="#1a1510"
      />
    </group>
  );
}
