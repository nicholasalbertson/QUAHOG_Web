import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import packs from "../content/licensedPacks.json";

// NPCs on both builds. The file is fetched by scripts/fetch_licensed_packs.mjs
// and is not committed (it is large). If it is missing, callers pass a fallback
// body so the game still runs.

const CAST = packs.packs.filter((pack) => pack.role === "character" && pack.dest);

export function castUrl(slot: number): string | null {
  if (!CAST.length) return null;
  const pack = CAST[((slot % CAST.length) + CAST.length) % CAST.length];
  return pack.dest.startsWith("/") ? pack.dest : `/vendor/cc0/files/${pack.dest}`;
}

const readyCache = new Map<string, Promise<boolean>>();

function fileReady(url: string): Promise<boolean> {
  const cached = readyCache.get(url);
  if (cached) return cached;
  const pending = fetch(url, { method: "HEAD" }).then((res) => res.ok).catch(() => false);
  readyCache.set(url, pending);
  return pending;
}

class BodyBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const bakedCache = new Map<string, THREE.Group[]>();

function clipNamed(clips: THREE.AnimationClip[], pattern: RegExp): THREE.AnimationClip | null {
  return clips.find((clip) => pattern.test(clip.name)) ?? null;
}

// Bake skinning into a plain mesh. The tiles world sits millions of meters
// from the origin, and GPU skinning in that frame shatters. A baked pose is
// a rigid mesh, which is what the tiles build can draw. The street build uses
// the same poses so both crowds match.
function bakePose(source: THREE.Object3D, clip: THREE.AnimationClip | null, time: number): THREE.Group {
  const scene = skeletonClone(source);
  scene.updateMatrixWorld(true);
  if (clip) {
    const mixer = new THREE.AnimationMixer(scene);
    mixer.clipAction(clip).play();
    mixer.setTime(time);
    scene.updateMatrixWorld(true);
  }
  const out = new THREE.Group();
  scene.traverse((obj) => {
    const skinned = obj as THREE.SkinnedMesh;
    if (!skinned.isSkinnedMesh) return;
    if (!skinned.geometry.getAttribute("skinIndex")) return;
    const src = skinned.geometry.getAttribute("position");
    const positions = new Float32Array(src.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < src.count; i++) {
      v.fromBufferAttribute(src, i);
      skinned.applyBoneTransform(i, v);
      v.applyMatrix4(skinned.matrixWorld);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const uv = skinned.geometry.getAttribute("uv");
    if (uv) geom.setAttribute("uv", uv);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, skinned.material);
    mesh.castShadow = true;
    out.add(mesh);
  });
  out.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(out);
  const height = box.max.y - box.min.y;
  if (height > 0.2 && height < 30) {
    const fit = 1.75 / height;
    out.scale.setScalar(fit);
    out.position.y = -box.min.y * fit;
  }
  return out;
}

function framesFor(url: string, gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }): THREE.Group[] {
  const cached = bakedCache.get(url);
  if (cached) return cached;
  const idle = clipNamed(gltf.animations, /idle/i);
  const walk = clipNamed(gltf.animations, /walk/i);
  const frames = [bakePose(gltf.scene, idle, 0)];
  if (walk) {
    for (let i = 0; i < 4; i++) frames.push(bakePose(gltf.scene, walk, (walk.duration * (i + 0.5)) / 4));
  }
  bakedCache.set(url, frames);
  return frames;
}

function tintCopy(frame: THREE.Object3D, slot: number) {
  const tint = new THREE.Color().setHSL(((slot % 8) * 0.17) % 1, 0.42, 0.48);
  frame.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = list.map((mat) => {
      const copy = mat.clone();
      if (copy instanceof THREE.MeshStandardMaterial) copy.color.lerp(tint, 0.5);
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
  });
}

function Rig({ url, slot, moving }: { url: string; slot: number; moving?: () => boolean }) {
  const gltf = useGLTF(url);
  const frames = useMemo(() => framesFor(url, gltf).map((frame) => {
    const copy = frame.clone(true);
    tintCopy(copy, slot);
    return copy;
  }), [gltf, url, slot]);
  const root = useRef<THREE.Group>(null);
  const clock = useRef(0);
  useFrame((_, dt) => {
    const group = root.current;
    if (!group) return;
    const walking = !!moving?.();
    clock.current += dt;
    const index = walking && frames.length > 1
      ? 1 + Math.floor(clock.current * 6) % (frames.length - 1)
      : 0;
    group.children.forEach((child, i) => { child.visible = i === index; });
  });
  return (
    <group ref={root}>
      {frames.map((frame, i) => <primitive key={i} object={frame} visible={i === 0} />)}
    </group>
  );
}

export function LicensedHuman({
  slot,
  moving,
  fallback,
  scale = 1,
}: {
  slot: number;
  moving?: () => boolean;
  fallback: ReactNode;
  scale?: number;
}) {
  const url = castUrl(slot);
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!url) { setOk(false); return; }
    let alive = true;
    fileReady(url).then((yes) => { if (alive) setOk(yes); });
    return () => { alive = false; };
  }, [url]);
  if (!url || ok === false) return <>{fallback}</>;
  if (ok === null) return null;
  return (
    <BodyBoundary fallback={fallback}>
      <Suspense fallback={null}>
        <group scale={scale}>
          <Rig url={url} slot={slot} moving={moving} />
        </group>
      </Suspense>
    </BodyBoundary>
  );
}
