import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { shared } from "../shared";

/** Warm streetlight points near New Bedford CORE. */
const CORE_SPOTS: [number, number][] = [
  [-266, 106],
  [-250, 90],
  [-280, 120],
  [-240, 130],
  [-300, 100],
];

function isNight(hour: number): boolean {
  return hour < 6 || hour >= 19;
}

/**
 * Night streetlight boost — when shared.hour is night, raise a few point
 * lights near CORE (TrafficLights already cycle lamp emissives; this adds
 * fill light so streets stay readable after dusk).
 */
export function NightLights() {
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const spots = useMemo(() => CORE_SPOTS, []);

  useFrame(() => {
    const night = isNight(shared.hour);
    for (let i = 0; i < spots.length; i++) {
      const L = refs.current[i];
      if (L) {
        L.intensity = night ? 2.4 : 0;
        L.visible = night;
      }
      const m = mats.current[i];
      if (m) m.emissiveIntensity = night ? 1.8 : 0.05;
    }
  });

  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 4.2, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial
              ref={(m) => {
                mats.current[i] = m;
              }}
              color="#ffd9a0"
              emissive="#ffc878"
              emissiveIntensity={0.05}
            />
          </mesh>
          <pointLight
            ref={(l) => {
              refs.current[i] = l;
            }}
            position={[0, 4.2, 0]}
            color="#ffd9a0"
            intensity={0}
            distance={28}
            decay={2}
          />
        </group>
      ))}
    </group>
  );
}
