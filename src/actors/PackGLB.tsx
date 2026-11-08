import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { reportModel } from "../debug/modelStatus";

// Free every GPU resource a loaded GLB holds: geometries, materials and
// textures of every mesh under each given root. The roots are traversed
// together and each resource is disposed exactly once (Sets dedupe):
// PackGLB renders a clone of the loaded scene, and three.js clone()
// shares geometry/material/texture references with the original, so
// disposing the clone alone would already free the original's resources
// — but traversing both roots makes that sharing an explicit contract
// rather than an accident, and stays correct if the clone ever deep-copies.
// Assumes the GLB's textures are embedded per-file (true of every
// pipeline/pack GLB): a texture shared with another still-mounted object
// would be freed out from under it — no such sharing exists in this
// codebase (PackGLB loads per instance, no module cache). Disposing an
// already-disposed resource is a no-op in three.js, so double calls are
// harmless; the Sets keep it to one call each regardless.
// Skinned meshes: geometry/material are disposed the same way; the
// skeleton's bone texture is owned by the renderer, and no PackGLB model
// in this game is skinned (rigged characters go through usePackGLB).
export function disposeGltfScene(
  ...roots: (THREE.Object3D | null | undefined)[]
): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  for (const root of roots) {
    if (!root) continue;
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        materials.add(m);
        // Every texture slot on the material (map, normalMap,
        // roughnessMap, emissiveMap, aoMap, ...). Non-texture values
        // (numbers, colors, vectors, userData) fail the instanceof check.
        for (const value of Object.values(m)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    });
  }
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

// PackGLB — loads one Blender-pack GLB (Meshopt) into the game world.
// Same loader pattern as RevueltoCar: drei's useGLTF has no Meshopt decoder
// registered, so pack GLBs must come through a loader with setMeshoptDecoder.
// Manual load (no Suspense): renders nothing until the file arrives, so a
// slow or missing file leaves a gap instead of suspending the whole scene.
// Pack models are authored in metres, forward +Z, origin at ground-contact
// centre — the same convention as the procedural Vehicle — so they drop
// into existing layout groups unchanged.
// §2.10.3 — fallback vehicle: when a pack GLB fails to load, render a
// simple procedural box car (same convention: forward +Z, origin at
// ground-contact centre, ~4.5 m long) in a bright fallback orange, so a
// missing file leaves a visible placeholder instead of an invisible car.
// The color marks it as a fallback, not a real model.
function FallbackVehicle() {
  return (
    <group>
      {/* body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.9, 0.7, 4.5]} />
        <meshStandardMaterial color="#ff7f00" roughness={0.6} />
      </mesh>
      {/* cabin */}
      <mesh position={[0, 1.15, -0.3]} castShadow>
        <boxGeometry args={[1.7, 0.6, 2.2]} />
        <meshStandardMaterial color="#ff9f40" roughness={0.6} />
      </mesh>
      {/* wheels */}
      {[-0.85, 0.85].map((x) =>
        [-1.4, 1.4].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.33, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.33, 0.33, 0.25, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function PackGLB({ path }: { path: string }) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    let alive = true;
    reportModel(path, "loading");
    loader.load(
      path,
      (gltf) => {
        reportModel(path, "loaded");
        if (alive) setScene(gltf.scene);
      },
      undefined,
      (err) => {
        reportModel(path, "failed", err instanceof Error ? err.message : String(err));
        console.error("[PackGLB] failed to load", path, err);
        // §2.10.3 — mark the failure so the fallback vehicle renders.
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [path]);

  const cloned = useMemo(() => (scene ? scene.clone(true) : null), [scene]);

  // #37 BlenderKit / pack shadows: cast + receive so night headlights read on hulls.
  useEffect(() => {
    if (!cloned) return;
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [cloned]);

  // Real GPU unload (2026-11-07 streaming fix): when this component
  // unmounts — or its path changes — the rendered clone AND the loaded
  // scene are disposed (see disposeGltfScene). Before this, unmount only
  // set alive=false and the geometry/materials/textures stayed resident
  // forever, which is what filled the iPhone up while driving. If the
  // component unmounts while a load is still in flight, scene is still
  // null and there is nothing to dispose: the parsed GLTF was never
  // rendered, so no GPU buffers were ever uploaded for it.
  useEffect(() => {
    if (!cloned) return;
    return () => {
      disposeGltfScene(cloned, scene);
    };
  }, [cloned, scene]);

  if (!cloned) {
    // §2.10.3 — a failed load renders the fallback vehicle, not nothing.
    // (A load still in flight renders nothing, as before.)
    return failed ? <FallbackVehicle /> : null;
  }
  return <primitive object={cloned} />;
}
