import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { stepGait, type GaitState } from "./locomotion";
import { PED_BUILD_SCALE, type PedBuild } from "./pedLooks";

// A simple low-poly humanoid (head, torso, swinging arms + legs) built from
// primitives. Feet rest at local y=0; faces +z. Shared by the player and
// pedestrians so neither is a "blob". Walk cycle animates while `moving()`.

export interface CharacterProps {
  skin?: string;
  shirt?: string;
  pants?: string;
  hair?: string;
  moving?: () => boolean;
  /** §2.4 — locomotion speed: 0 idle, 1 walk, 2 run/sprint. When given, it
   *  drives the gait (phase rate + swing amplitude); `moving` is the legacy
   *  boolean fallback (walk when true). */
  speed?: () => number;
  /** §2.4.5 — airborne (jumping/falling): the pose tucks (legs up, arms up). */
  airborne?: () => boolean;
  /** §2.7.1 — build (silhouette): "default" | "tall" | "stocky". Scales the
   *  root group about the ground so the feet stay planted. */
  build?: PedBuild;
  /** Empty or omitted draws no hat. */
  hat?: string;
  /** A second torso block. Empty or omitted leaves the shirt as the outer layer. */
  coat?: string;
}

export function Character({
  skin = "#caa07a",
  shirt = "#3f6cc0",
  pants = "#2c2f3a",
  hair = "#2a2018",
  moving = () => true,
  speed,
  airborne,
  build = "default",
  hat = "",
  coat = "",
}: CharacterProps) {
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  // §2.4 — gait state lives in the pure locomotion module (unit-tested);
  // the component just applies the pose each frame.
  const gaitState = useRef<GaitState>({ phase: Math.random() * Math.PI * 2, gait: 0, breath: Math.random() * Math.PI * 2, air: 0 });

  useFrame((_, dt) => {
    const spd = speed ? speed() : moving() ? 1 : 0;
    const pose = stepGait(gaitState.current, spd, dt, airborne ? airborne() : false);
    if (legL.current) legL.current.rotation.x = pose.legL;
    if (legR.current) legR.current.rotation.x = pose.legR;
    if (armL.current) armL.current.rotation.x = pose.armL;
    if (armR.current) armR.current.rotation.x = pose.armR;
    if (bob.current) bob.current.position.y = pose.bobY;
    if (torso.current) torso.current.rotation.x = pose.torsoPitch;
  });

  return (
    <group ref={bob} scale={PED_BUILD_SCALE[build]}>
      {/* legs (pivot at hips) */}
      <group ref={legL} position={[-0.12, 0.9, 0]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[0.18, 0.9, 0.2]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
      </group>
      <group ref={legR} position={[0.12, 0.9, 0]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[0.18, 0.9, 0.2]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
      </group>

      {/* torso (breathing pivot) */}
      <group ref={torso}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[0.5, 0.72, 0.28]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>
      {coat && (
        <mesh position={[0, 1.28, 0.02]} castShadow>
          <boxGeometry args={[0.56, 0.62, 0.32]} />
          <meshStandardMaterial color={coat} roughness={0.75} />
        </mesh>
      )}
      </group>

      {/* arms (pivot at shoulders) */}
      <group ref={armL} position={[-0.32, 1.55, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.13, 0.62, 0.15]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.66, 0]} castShadow>
          <boxGeometry args={[0.12, 0.12, 0.14]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>
      <group ref={armR} position={[0.32, 1.55, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.13, 0.62, 0.15]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.66, 0]} castShadow>
          <boxGeometry args={[0.12, 0.12, 0.14]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>

      {/* neck + head */}
      <mesh position={[0, 1.66, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.12, 8]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      {/* hair cap */}
      <mesh position={[0, 1.88, -0.02]} castShadow>
        <sphereGeometry args={[0.155, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={hair} roughness={0.85} />
      </mesh>
      {hat && (
        <mesh position={[0, 1.96, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.06, 10]} />
          <meshStandardMaterial color={hat} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}
