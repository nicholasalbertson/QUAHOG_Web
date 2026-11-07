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

let cobbleCache: THREE.Texture | null = null;
export function vendorCobbleTexture(): THREE.Texture {
  if (cobbleCache) return cobbleCache;
  const t = prep(makeCobbleTexture(), true, 2);
  upgrade(t, POLYHAVEN.cobbleDiff, true);
  cobbleCache = t;
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
