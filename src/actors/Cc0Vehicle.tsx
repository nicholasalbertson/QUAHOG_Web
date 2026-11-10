import { Component, Suspense, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { ProceduralCar } from "../earth/ProceduralCar";
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

function KenneyMesh({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);
  return <primitive object={scene} />;
}

export function Cc0Vehicle({ slot, scale = 1.7 }: { slot: number; scale?: number }) {
  const url = vehicleUrl(slot);
  return (
    <CarBoundary fallback={<ProceduralCar style={slot} />}>
      <Suspense fallback={<ProceduralCar style={slot} />}>
        <group scale={scale} position={[0, 0.51, 0]}>
          <KenneyMesh url={url} />
        </group>
      </Suspense>
    </CarBoundary>
  );
}
