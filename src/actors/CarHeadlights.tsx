import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import { useGame } from "../store";
import { carProfile } from "../earth/heroVehicleGeometry";
import type { VehicleType } from "../earth/vehicleTypes";

// Night fix (playtest 2026-11-02, R4 review): the player car already brightened
// its lamp emissive at night, but emissive alone lights nothing —
// the road ahead stayed black, which is why night driving was unreadable.
// These are the missing half: two real spotlights mounted exactly on the
// logic-profile lamp positions, aimed forward and slightly down so the pool
// lands on the road ahead instead of the sky. No shadows (a shadow-casting
// pair would double the shadow-map cost for a phone); the existing sun/moon
// lights keep doing the shadowing.
//
// Mounting contract: this component renders INSIDE Car's [0, -0.6, 0] group,
// i.e. in the player-car local frame, where local +Z is forward (the body's
// yaw rotation maps +Z to (sin yaw, 0, cos yaw), the drive direction).
// Lamp x/y/z below derive from the logic-type profile (carProfile), so the
// beams stay at the car's front whatever pack visual is equipped. For pack
// visuals these are profile approximations, not the pack's own lamp
// positions — the beams still leave the front of the car.

export function headlightNightFactor(dayT: number): number {
  return THREE.MathUtils.clamp(1 - dayT, 0, 1);
}

const BEAM_COLOR = "#ffedb8";
const BEAM_ANGLE = 0.42;
const BEAM_PENUMBRA = 0.55;
const BEAM_DISTANCE = 55;
const BEAM_DECAY = 1;
const BEAM_PEAK = 6; // decay 1: ~0.6 at 10 m, ~0.2 at 30 m — a readable pool, not a blowout

export function CarHeadlights({ type }: { type: VehicleType }) {
  const p = useMemo(() => carProfile(type), [type]);
  const zFront = p.length / 2 + 0.015;
  const zRear = -p.length / 2 - 0.02;
  const lampY = p.belt - 0.27;
  const left = useRef<THREE.SpotLight>(null);
  const right = useRef<THREE.SpotLight>(null);
  const leftTarget = useRef<THREE.Object3D>(null);
  const rightTarget = useRef<THREE.Object3D>(null);
  const brakeLeft = useRef<THREE.MeshStandardMaterial>(null);
  const brakeRight = useRef<THREE.MeshStandardMaterial>(null);

  // A spotlight's target must be an object in the scene graph; wiring it
  // here (rather than target-position props) keeps the target parented to
  // the moving car body, so the beam steers with the car.
  useEffect(() => {
    if (left.current && leftTarget.current) left.current.target = leftTarget.current;
    if (right.current && rightTarget.current) right.current.target = rightTarget.current;
  }, []);

  useFrame(() => {
    const driving = useGame.getState().mode === "car";
    const night = headlightNightFactor(shared.dayT);
    const level = driving ? night * BEAM_PEAK : 0;
    if (left.current) left.current.intensity = level;
    if (right.current) right.current.intensity = level;
    // #38 Brake lamps: bright on brake/handbrake; dim running lights at night.
    const intensity = !driving
      ? 0
      : shared.carBraking
        ? 2.6
        : night > 0.4
          ? 0.35
          : 0.08;
    if (brakeLeft.current) brakeLeft.current.emissiveIntensity = intensity;
    if (brakeRight.current) brakeRight.current.emissiveIntensity = intensity;
  });

  return (
    <>
      {[-1, 1].map((side) => (
        <group key={`headlight${side}`}>
          <spotLight
            ref={side === -1 ? left : right}
            position={[side * p.width * 0.36, lampY, zFront + 0.038]}
            angle={BEAM_ANGLE}
            penumbra={BEAM_PENUMBRA}
            distance={BEAM_DISTANCE}
            decay={BEAM_DECAY}
            color={BEAM_COLOR}
            intensity={0}
          />
          {/* Aim point: same lateral offset, slightly below lamp height, 30 m ahead. */}
          <object3D
            ref={side === -1 ? leftTarget : rightTarget}
            position={[side * p.width * 0.36, lampY - 1.2, zFront + 30]}
          />
        </group>
      ))}
      {/* #38 Rear brake lamps (emissive discs — cheap, no extra shadow maps). */}
      {[-1, 1].map((side) => (
        <mesh key={`brake${side}`} position={[side * p.width * 0.34, lampY - 0.05, zRear]}>
          <boxGeometry args={[0.12, 0.06, 0.04]} />
          <meshStandardMaterial
            ref={side === -1 ? brakeLeft : brakeRight}
            color="#2a0505"
            emissive="#ff2020"
            emissiveIntensity={0.08}
            roughness={0.55}
          />
        </mesh>
      ))}
    </>
  );
}
