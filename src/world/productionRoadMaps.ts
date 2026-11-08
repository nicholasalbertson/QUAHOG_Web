import * as THREE from "three";
import { makeAsphaltTexture, makeNoiseNormal } from "./textures";
import { vendorAsphaltNormal, vendorAsphaltRoughness, vendorAsphaltTexture } from "./vendorTextures";

/** Shared production asphalt maps — Poly Haven CC0 when present, else P010 / procedural. */
let cached: { color: THREE.Texture; normal: THREE.Texture; roughness: THREE.Texture } | null = null;
export function productionRoadMaps() {
  if (cached) return cached;
  // Prefer Poly Haven diffuse/normal/rough; keep noise + P010 as immediate fallbacks.
  const color = vendorAsphaltTexture(false);
  const normal = vendorAsphaltNormal();
  // Seed normal with noise until Poly Haven lands (upgrade mutates in place).
  if (!normal.image || (normal.image as HTMLCanvasElement).width <= 2) {
    const noise = makeNoiseNormal();
    normal.image = noise.image;
    normal.needsUpdate = true;
  }
  const roughness = vendorAsphaltRoughness();
  // Also try the older production-roads swatch as a secondary color upgrade.
  const loader = new THREE.TextureLoader();
  const base = makeAsphaltTexture(false);
  void base;
  loader.load("/quahog-assets/production-roads/asphalt-albedo.png", (loaded) => {
    // Only apply if Poly Haven hasn't already replaced the image with a large map.
    const img = color.image as HTMLImageElement | HTMLCanvasElement | undefined;
    if (img && "width" in img && img.width > 64) { loaded.dispose(); return; }
    color.image = loaded.image;
    color.needsUpdate = true;
    loaded.dispose();
  }, undefined, () => { /* keep vendor/procedural */ });
  cached = { color, normal, roughness };
  return cached;
}
