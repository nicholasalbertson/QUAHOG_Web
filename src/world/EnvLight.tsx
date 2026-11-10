import { useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { shared } from "../shared";
import { useGame } from "../store";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import packs from "../content/licensedPacks.json";

const HDRI = packs.packs.find((pack) => pack.role === "hdri");
const HDRI_URL = HDRI ? (HDRI.dest.startsWith("/") ? HDRI.dest : `/vendor/cc0/files/${HDRI.dest}`) : "";

// Image-based lighting. A Poly Haven HDRI is used when the fetch script has
// downloaded it. Otherwise a procedural room environment keeps reflections.
export function EnvLight() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    let disposed = false;
    let env: THREE.WebGLRenderTarget | null = null;
    const applyRoom = () => {
      if (disposed) return;
      const room = new RoomEnvironment();
      env = pmrem.fromScene(room, 0.04);
      room.dispose();
      scene.environment = env.texture;
    };
    if (!HDRI_URL) applyRoom();
    else {
      new RGBELoader().load(HDRI_URL, (hdr) => {
        if (disposed) { hdr.dispose(); return; }
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        env = pmrem.fromEquirectangular(hdr);
        hdr.dispose();
        scene.environment = env.texture;
      }, undefined, () => applyRoom());
    }
    return () => {
      disposed = true;
      scene.environment = null;
      env?.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  useFrame(() => {
    const weather = useGame.getState().weather;
    scene.environmentIntensity = (0.12 + shared.dayT * 0.24) * (weather === "snow" ? 0.7 : 1);
  });
  return null;
}
