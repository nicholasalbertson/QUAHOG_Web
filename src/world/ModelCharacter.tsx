import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  CHARACTER_MODEL_URL,
  FRANKLIN_MODEL_URL,
  registryModelById,
  registryModelByUrl,
  usePrimitiveBody as castUsesPrimitiveBody,
  type CharacterModelId,
} from "../assets/modelRegistry";
import { Character } from "./Character";
import { LicensedHuman } from "../actors/LicensedHuman";

// Player / cast body. Franklin keeps the authored animated GLB. Borden cast
useGLTF.preload(FRANKLIN_MODEL_URL);
useGLTF.preload("/models/CesiumMan.glb");

const FACE = 0;
const Y_OFF = 0;

type ModelProps = {
  moving?: () => boolean;
  sprinting?: () => boolean;
  tint?: string;
  /** Registry cast id; defaults to Franklin. */
  modelId?: CharacterModelId | string;
};

export function ModelCharacter({ moving, sprinting, tint, modelId = "franklin" }: ModelProps) {
  const meta = registryModelById(modelId) ?? registryModelByUrl(CHARACTER_MODEL_URL);
  const url = meta?.url ?? CHARACTER_MODEL_URL;
  const scale = meta?.scale ?? 1.0;

  if (castUsesPrimitiveBody(modelId) || meta?.usePrimitiveBody) {
    return (
      <group rotation-y={FACE} position={[0, Y_OFF, 0]} scale={scale}>
        <LicensedHuman
          slot={modelId === "lizzie" ? 0 : 1}
          moving={moving}
          fallback={<Character shirt={tint} moving={moving} />}
        />
      </group>
    );
  }

  return (
    <group rotation-y={FACE} position={[0, Y_OFF, 0]}>
      <ModelBoundary url={url} moving={moving} tint={tint}>
        <RiggedModel moving={moving} sprinting={sprinting} tint={tint} url={url} scale={scale} />
      </ModelBoundary>
    </group>
  );
}

function RiggedModel({
  moving,
  sprinting,
  tint,
  url,
  scale,
}: ModelProps & { url: string; scale: number }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => skeletonClone(gltf.scene), [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, scene);
  const current = useRef<{ name: string; action: THREE.AnimationAction } | null>(null);
  const isFranklin = url === FRANKLIN_MODEL_URL;

  useEffect(() => {
    const owned: THREE.Material[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const src = mesh.material as THREE.Material;
      let m = (Array.isArray(src) ? src[0] : src) as THREE.MeshStandardMaterial;
      if (tint) {
        m = m.clone();
        owned.push(m);
        // Franklin textured materials must not be colour-multiplied.
        if (!isFranklin && m.color) m.color.set(tint).multiplyScalar(0.72);
        mesh.material = m;
      }
      m.metalness = 0;
      m.roughness = Math.max(m.roughness ?? 0.9, 0.9);
      if (m.emissive) {
        m.emissive.setRGB(0, 0, 0);
        m.emissiveIntensity = 0;
      }
      m.envMapIntensity = 0.5;
    });

    if (isFranklin) {
      const first = names.includes("Idle") ? actions["Idle"] : names.length ? actions[names[0]] : null;
      if (first) {
        first.reset().play();
        current.current = { name: names.includes("Idle") ? "Idle" : names[0], action: first };
      }
    } else {
      const a = names.length ? actions[names[0]] : null;
      if (a) {
        a.reset().play();
        current.current = { name: names[0], action: a };
      } else {
        current.current = null;
      }
    }

    return () => {
      current.current = null;
      for (const material of owned) material.dispose();
    };
  }, [actions, names, scene, tint, isFranklin]);

  useFrame(() => {
    if (isFranklin) {
      // Franklin gait blend (#31): speed thresholds via sprint flag + moving.
      const isMoving = moving?.() ?? false;
      const isSprint = sprinting?.() ?? false;
      const want = !isMoving ? "Idle" : isSprint ? "Run" : "Walk";
      if (current.current?.name === want) return;
      const next = actions[want];
      if (!next) return;
      const prev = current.current?.action;
      // Longer crossfade between Walk↔Run for a softer gait blend.
      const fade = want === "Idle" || current.current?.name === "Idle" ? 0.2 : 0.35;
      if (prev) prev.fadeOut(fade);
      next.reset().fadeIn(fade).play();
      current.current = { name: want, action: next };
      return;
    }
    if (current.current) current.current.action.paused = moving ? !moving() : false;
  });

  return (
    <group scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

class ModelBoundary extends Component<
  ModelProps & { url: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[assets] model failed:", this.props.url, error);
  }

  render() {
    if (this.state.failed) {
      return <Character shirt={this.props.tint} moving={this.props.moving} />;
    }
    return this.props.children;
  }
}
