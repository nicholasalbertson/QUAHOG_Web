import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { bakePose } from "./LicensedHuman";

describe("baked Quaternius rig", () => {
  it("comes out person-sized instead of a shattered cloud", async () => {
    const file = join(process.cwd(), "public/vendor/cc0/files/characters/quaternius-human.glb");
    const bytes = readFileSync(file);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const loader = new GLTFLoader();
    const gltf = await new Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }>((resolve, reject) => {
      loader.parse(buffer, "", resolve, reject);
    });
    const idle = gltf.animations.find((clip) => /idle/i.test(clip.name)) ?? null;
    const pose = bakePose(gltf.scene, idle, 0);
    expect(pose).not.toBeNull();
    const box = new THREE.Box3().setFromObject(pose!);
    const height = box.max.y - box.min.y;
    expect(height).toBeGreaterThan(1.6);
    expect(height).toBeLessThan(1.9);
    expect(box.min.y).toBeGreaterThan(-0.05);
    expect(box.min.y).toBeLessThan(0.05);
  });
});