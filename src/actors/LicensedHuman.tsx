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
  const pending = (async () => {
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (head.ok) return true;
    } catch { /* some preview servers reject HEAD */ }
    try {
      const get = await fetch(url);
      await get.body?.cancel();
      return get.ok;
    } catch {
      return false;
    }
  })();
  readyCache.set(url, pending);
  return pending;
}

class BodyBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export type HumanGait = "idle" | "walk" | "run" | "jump" | "punch";

export interface BakedLayout {
  count: number;
  walk: number;
  run: number;
  jump: number;
  punch: number;
}

/** Which baked frame to show. One mixer per archetype, shared by every ped. */
export function pickFrame(layout: BakedLayout, gait: HumanGait, clock: number): number {
  if (gait === "punch" && layout.punch >= 0) return layout.punch;
  if (gait === "jump" && layout.jump >= 0) return layout.jump;
  if (gait === "run" && layout.run > 0) {
    const start = 1 + layout.walk;
    return start + Math.floor(Math.max(0, clock) * 10) % layout.run;
  }
  if ((gait === "walk" || gait === "run") && layout.walk > 0) {
    return 1 + Math.floor(Math.max(0, clock) * 6) % layout.walk;
  }
  return 0;
}

interface BakedCast {
  frames: THREE.Group[];
  layout: BakedLayout;
}

const bakedCache = new Map<string, BakedCast>();

function clipNamed(clips: THREE.AnimationClip[], pattern: RegExp): THREE.AnimationClip | null {
  return clips.find((clip) => pattern.test(clip.name)) ?? null;
}

// Bake skinning into a plain mesh. The tiles world sits millions of meters
// from the origin, and GPU skinning in that frame shatters. A baked pose is
// a rigid mesh, which is what the tiles build can draw. The street build uses
// the same poses so both crowds match.
export function bakePose(source: THREE.Object3D, clip: THREE.AnimationClip | null, time: number): THREE.Group | null {
  const scene = skeletonClone(source);
  // The source may already sit in the earth frame. Bake from the rig's own
  // matrices, or the vertices land millions of meters out and the mesh shatters.
  scene.position.set(0, 0, 0);
  scene.rotation.set(0, 0, 0);
  scene.scale.set(1, 1, 1);
  scene.matrix.identity();
  scene.matrixWorld.identity();
  scene.updateMatrixWorld(true);
  if (clip) {
    const mixer = new THREE.AnimationMixer(scene);
    mixer.clipAction(clip).play();
    mixer.setTime(time);
    scene.updateMatrixWorld(true);
  }
  const out = new THREE.Group();
  let shattered = false;
  scene.traverse((obj) => {
    if (shattered) return;
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
      if (Math.abs(v.x) > 40 || Math.abs(v.y) > 40 || Math.abs(v.z) > 40) {
        shattered = true;
        return;
      }
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const uv = skinned.geometry.getAttribute("uv");
    if (uv) geom.setAttribute("uv", uv);
    geom.computeVertexNormals();
    let material: THREE.Material = skinned.material as THREE.Material;
    if (!Array.isArray(skinned.material) && skinned.material) {
      material = skinned.material.clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        // A metalness of 1 with no environment map reads as a flat grey figure.
        material.metalness = Math.min(material.metalness, 0.12);
        material.roughness = Math.max(material.roughness, 0.58);
        material.envMapIntensity = 0.35;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      }
    }
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    out.add(mesh);
  });
  if (shattered || out.children.length === 0) return null;
  out.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(out);
  const height = box.max.y - box.min.y;
  if (!(height > 0.2 && height < 8)) return null;
  const fit = 1.75 / height;
  out.scale.setScalar(fit);
  out.position.y = -box.min.y * fit;
  return out;
}

function pushPose(frames: THREE.Group[], pose: THREE.Group | null): boolean {
  if (!pose) return false;
  frames.push(pose);
  return true;
}

function framesFor(url: string, gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }): BakedCast {
  const cached = bakedCache.get(url);
  if (cached) return cached;
  const empty: BakedCast = { frames: [], layout: { count: 0, walk: 0, run: 0, jump: -1, punch: -1 } };
  try {
    const idle = clipNamed(gltf.animations, /idle/i);
    const walk = clipNamed(gltf.animations, /walk/i);
    const run = clipNamed(gltf.animations, /run/i);
    const jump = clipNamed(gltf.animations, /jump/i);
    const punch = clipNamed(gltf.animations, /punch/i);
    const frames: THREE.Group[] = [];
    if (!pushPose(frames, bakePose(gltf.scene, idle, 0))) {
      bakedCache.set(url, empty);
      return empty;
    }
    let walkCount = 0;
    if (walk) {
      for (let i = 0; i < 4; i++) {
        if (pushPose(frames, bakePose(gltf.scene, walk, (walk.duration * (i + 0.5)) / 4))) walkCount += 1;
      }
    }
    let runCount = 0;
    if (run) {
      for (let i = 0; i < 4; i++) {
        if (pushPose(frames, bakePose(gltf.scene, run, (run.duration * (i + 0.5)) / 4))) runCount += 1;
      }
    }
    const jumpIndex = pushPose(frames, jump ? bakePose(gltf.scene, jump, jump.duration * 0.35) : null) ? frames.length - 1 : -1;
    const punchIndex = pushPose(frames, punch ? bakePose(gltf.scene, punch, punch.duration * 0.4) : null) ? frames.length - 1 : -1;
    const cast: BakedCast = {
      frames,
      layout: { count: frames.length, walk: walkCount, run: runCount, jump: jumpIndex, punch: punchIndex },
    };
    // One bake per archetype URL. Every ped that shares the file clones these frames.
    bakedCache.set(url, cast);
    return cast;
  } catch (e) {
    console.error("[character] bake failed", url, e);
    bakedCache.set(url, empty);
    return empty;
  }
}

function tintCopy(frame: THREE.Object3D, slot: number) {
  const tint = new THREE.Color().setHSL(((slot % 8) * 0.17) % 1, 0.42, 0.48);
  frame.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = list.map((mat) => {
      const copy = mat.clone();
      if (copy instanceof THREE.MeshStandardMaterial) {
        copy.color.lerp(tint, 0.18);
        if (copy.map) copy.map.colorSpace = THREE.SRGBColorSpace;
      }
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
  });
}

function Rig({ url, slot, moving, gait }: { url: string; slot: number; moving?: () => boolean; gait?: () => HumanGait }) {
  const gltf = useGLTF(url);
  const baked = useMemo(() => {
    const cast = framesFor(url, gltf);
    return {
      layout: cast.layout,
      frames: cast.frames.map((frame) => {
        const copy = frame.clone(true);
        tintCopy(copy, slot);
        return copy;
      }),
    };
  }, [gltf, url, slot]);
  if (!baked.frames.length) throw new Error("character bake produced no frames");
  const root = useRef<THREE.Group>(null);
  const clock = useRef(0);
  useFrame((_, dt) => {
    const group = root.current;
    if (!group) return;
    const mode: HumanGait = gait ? gait() : moving?.() ? "walk" : "idle";
    if (mode === "idle") clock.current = 0;
    else clock.current += dt;
    const index = pickFrame(baked.layout, mode, clock.current);
    group.children.forEach((child, i) => { child.visible = i === index; });
  });
  return (
    <group ref={root}>
      {baked.frames.map((frame, i) => <primitive key={i} object={frame} visible={i === 0} />)}
    </group>
  );
}

export function LicensedHuman({
  slot,
  moving,
  gait,
  fallback,
  scale = 1,
}: {
  slot: number;
  moving?: () => boolean;
  gait?: () => HumanGait;
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
          <Rig url={url} slot={slot} moving={moving} gait={gait} />
        </group>
      </Suspense>
    </BodyBoundary>
  );
}
