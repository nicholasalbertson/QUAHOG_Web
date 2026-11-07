import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { dressFootprint } from "./districtStyle";
import { districtFacadeMaps } from "./districtMaterials";
import { markerFade } from "./markerVisual";
import { HOSPITAL } from "../places";
import { shared } from "../shared";
import { useGame } from "../store";

const RADIUS = 12;

// Stand-in St. Luke's Hospital (§37 civic): where the player wakes after being
// WASTED. A pale block with a red cross; re-anchored to the real building once
// the slice grows north (see places.ts). On-foot interior when inside radius.
export function Hospital() {
  const geometry = useMemo(
    () =>
      dressFootprint(new THREE.BoxGeometry(14, 8, 10), {
        name: "civic-clinic",
        footprint: [
          [-7, -5],
          [7, -5],
          [7, 5],
          [-7, 5],
        ],
        height: 8,
      }),
    [],
  );
  const maps = useMemo(() => districtFacadeMaps("granite"), []);
  const ring = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);
  const [showInterior, setShowInterior] = useState(false);

  useFrame(() => {
    const game = useGame.getState();
    if (game.paused) return;
    const body = game.mode === "car" ? shared.car : shared.player;
    const t = body?.translation();
    const here = !!t && Math.hypot(t.x - HOSPITAL[0], t.z - HOSPITAL[2]) < RADIUS;
    const onFootInside = here && game.mode === "foot";
    if (showInterior !== onFootInside) setShowInterior(onFootInside);
    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial;
      const base = here ? (onFootInside ? 0.16 : 0.38) : 0.17;
      m.opacity =
        base * markerFade(Math.hypot(camera.position.x - HOSPITAL[0], camera.position.z - HOSPITAL[2]));
      ring.current.visible = m.opacity > 0.01;
    }
  });

  return (
    // sit on the ground (HOSPITAL[1] is the respawn height, not the building base)
    <group position={[HOSPITAL[0], 0, HOSPITAL[2]]}>
      <mesh geometry={geometry} position={[0, 4, -14]} castShadow receiveShadow>
        {/* mid grey, not near-white: a #dfe3e6 face blew out to a glowing white
            block under the sun + bloom */}
        <meshStandardMaterial vertexColors map={maps.albedo} roughness={0.9} />
      </mesh>
      {/* red cross sign */}
      <group position={[0, 6.5, -8.9]}>
        <mesh>
          <boxGeometry args={[1.6, 0.5, 0.1]} />
          <meshStandardMaterial color="#d33" emissive="#d33" emissiveIntensity={0.5} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.5, 1.6, 0.1]} />
          <meshStandardMaterial color="#d33" emissive="#d33" emissiveIntensity={0.5} />
        </mesh>
      </group>
      {showInterior && (
        <group position={[0, 0, -14]}>
          <mesh position={[0, 0.06, 0]} receiveShadow>
            <boxGeometry args={[12, 0.12, 8]} />
            <meshStandardMaterial color="#d8dde2" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.2, -3.9]}>
            <boxGeometry args={[12, 4.2, 0.15]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.2, 3.9]}>
            <boxGeometry args={[12, 4.2, 0.15]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.85} />
          </mesh>
          <mesh position={[-5.9, 2.2, 0]}>
            <boxGeometry args={[0.15, 4.2, 8]} />
            <meshStandardMaterial color="#e2e7eb" roughness={0.85} />
          </mesh>
          <mesh position={[5.9, 2.2, 0]}>
            <boxGeometry args={[0.15, 4.2, 8]} />
            <meshStandardMaterial color="#e2e7eb" roughness={0.85} />
          </mesh>
          <mesh position={[0, 4.4, 0]}>
            <boxGeometry args={[12, 0.12, 8]} />
            <meshStandardMaterial color="#cfd6dc" roughness={1} />
          </mesh>
        </group>
      )}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.12, 0]}>
        <ringGeometry args={[RADIUS - 0.3, RADIUS, 40]} />
        <meshBasicMaterial color="#4ad66d" transparent opacity={0.17} depthWrite={false} />
      </mesh>
    </group>
  );
}
