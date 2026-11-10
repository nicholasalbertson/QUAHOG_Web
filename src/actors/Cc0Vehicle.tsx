import { Component, Suspense, useMemo, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ProceduralCar } from "../earth/ProceduralCar";
import { shared } from "../shared";
import packs from "../content/licensedPacks.json";

// Traffic and patrol bodies that are already in the Kenney CC0 car kit.
// A missing file falls back to the box car so a fresh checkout still drives.

const VEHICLES = packs.packs.filter((pack) => pack.role === "vehicle");

export function vehicleUrl(slot: number): string {
  const pack = VEHICLES[((slot % VEHICLES.length) + VEHICLES.length) % VEHICLES.length];
  return encodeURI(pack.dest);
}

class CarBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const WHEEL = /wheel/i;
const FRONT = /front/i;

function KenneyMesh({ url, wheelR = 0.51, driven = false }: { url: string; wheelR?: number; driven?: boolean }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const map = mat && "map" in mat ? (mat.map as THREE.Texture | null) : null;
        if (map) map.colorSpace = THREE.SRGBColorSpace;
      }
    });
    return copy;
  }, [gltf]);
  const wheels = useMemo(() => {
    const found: { node: THREE.Object3D; front: boolean }[] = [];
    scene.traverse((node) => {
      if (!WHEEL.test(node.name)) return;
      found.push({ node, front: FRONT.test(node.name) });
    });
    return found;
  }, [scene]);
  useFrame((_, dt) => {
    if (!driven) return;
    const speed = shared.carSpeed;
    if (!Number.isFinite(dt) || dt <= 0) return;
    const spin = Number.isFinite(speed) ? (speed * dt) / wheelR : 0;
    const steer = THREE.MathUtils.clamp(shared.steerVisual ?? 0, -0.4, 0.4);
    for (const wheel of wheels) {
      wheel.node.rotation.x += spin;
      if (wheel.front) wheel.node.rotation.y = THREE.MathUtils.lerp(wheel.node.rotation.y, steer, 1 - Math.exp(-dt * 8));
    }
  });
  return <primitive object={scene} />;
}

export function Cc0Vehicle({ slot, scale = 1.8, driven = false }: { slot: number; scale?: number; driven?: boolean }) {
  const url = vehicleUrl(slot);
  return (
    <CarBoundary fallback={<ProceduralCar style={slot} />}>
      <Suspense fallback={<ProceduralCar style={slot} />}>
        {/* Kenney's kit is about 2.5 m long. 1.8 brings a sedan to ~4.6 m,
            and the wheels already touch local y=0, so it is not floated. */}
        <group scale={scale}>
          <KenneyMesh url={url} wheelR={0.3 * scale} driven={driven} />
        </group>
      </Suspense>
    </CarBoundary>
  );
}
