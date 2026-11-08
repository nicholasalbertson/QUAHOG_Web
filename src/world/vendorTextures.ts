import * as THREE from "three";
import { POLYHAVEN } from "./vendorCatalog";
import { makeAsphaltTexture, makeCobbleTexture } from "./textures";

/**
 * Prefer Poly Haven CC0 PBR maps when present; fall back to procedural canvas art.
 * Loads are async — callers get a usable procedural texture immediately.
 */

function prep(t: THREE.Texture, color: boolean, repeat = 4): THREE.Texture {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function upgrade(target: THREE.Texture, url: string, color: boolean) {
  const loader = new THREE.TextureLoader();
  loader.load(
    url,
    (loaded) => {
      target.image = loaded.image;
      target.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      target.needsUpdate = true;
      loaded.dispose();
    },
    undefined,
    () => {
      /* keep procedural fallback */
    },
  );
}

let asphaltCache: THREE.Texture | null = null;
export function vendorAsphaltTexture(withLanes = false): THREE.Texture {
  if (asphaltCache && !withLanes) return asphaltCache;
  const t = prep(makeAsphaltTexture(withLanes), true, 1);
  upgrade(t, POLYHAVEN.asphaltDiff, true);
  if (!withLanes) asphaltCache = t;
  return t;
}

let asphaltNorCache: THREE.Texture | null = null;
export function vendorAsphaltNormal(): THREE.Texture {
  if (asphaltNorCache) return asphaltNorCache;
  const t = prep(new THREE.Texture(), false, 1);
  // Neutral normal until the Poly Haven map lands.
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const x = c.getContext("2d")!;
  x.fillStyle = "#8080ff";
  x.fillRect(0, 0, 2, 2);
  t.image = c;
  t.needsUpdate = true;
  upgrade(t, POLYHAVEN.asphaltNor, false);
  asphaltNorCache = t;
  return t;
}

let asphaltRoughCache: THREE.Texture | null = null;
export function vendorAsphaltRoughness(): THREE.Texture {
  if (asphaltRoughCache) return asphaltRoughCache;
  const t = prep(new THREE.Texture(), false, 1);
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const x = c.getContext("2d")!;
  x.fillStyle = "#c8c8c8";
  x.fillRect(0, 0, 2, 2);
  t.image = c;
  t.needsUpdate = true;
  upgrade(t, POLYHAVEN.asphaltRough, false);
  asphaltRoughCache = t;
  return t;
}

let cobbleCache: THREE.Texture | null = null;
export function vendorCobbleTexture(): THREE.Texture {
  if (cobbleCache) return cobbleCache;
  const t = prep(makeCobbleTexture(), true, 2);
  upgrade(t, POLYHAVEN.cobbleDiff, true);
  cobbleCache = t;
  return t;
}

let cobbleNorCache: THREE.Texture | null = null;
export function vendorCobbleNormal(): THREE.Texture {
  if (cobbleNorCache) return cobbleNorCache;
  const t = prep(new THREE.Texture(), false, 2);
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const x = c.getContext("2d")!;
  x.fillStyle = "#8080ff";
  x.fillRect(0, 0, 2, 2);
  t.image = c;
  t.needsUpdate = true;
  upgrade(t, POLYHAVEN.cobbleNor, false);
  cobbleNorCache = t;
  return t;
}

let brickCache: THREE.Texture | null = null;
export function vendorBrickPavementTexture(): THREE.Texture {
  if (brickCache) return brickCache;
  const t = prep(makeCobbleTexture(), true, 3);
  upgrade(t, POLYHAVEN.brickDiff, true);
  brickCache = t;
  return t;
}
