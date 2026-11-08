import type { Camera, PerspectiveCamera } from "three";

// Explicit opt-in, development-only fixed views. Never active in a release.
// World x=east, z=-north; views are anchored to the existing Johnny Cake Hill
// landmarks, not invented GIS positions. Keep these stable for comparisons.
// Landmark origin for Seamen's Bethel (slice [-272.23, -106.5] → world).
const BETHEL: [number, number, number] = [-272.23, 7.5, 106.5];

export const REVIEW_SHOTS = {
  // Eyes pulled closer so the authored clapboard Bethel fills frame (not a
  // neighbor GIS box). Target = landmark roof line.
  "bethel-front": { eye: [-248, 10, 118], target: BETHEL, weather: "clear" as const },
  "bethel-side": { eye: [-286, 9, 122], target: BETHEL, weather: "clear" as const },
  "mariners-home": { eye: [-239, 9, 65], target: [-271, 6, 81], weather: "clear" as const },
  "water-street": { eye: [-150, 12, 23], target: [-222, 6, 74], weather: "clear" as const },
  "blizzard": { eye: [-248, 10, 118], target: BETHEL, weather: "snow" as const },
} as const;

export function reviewShot() {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const name = new URLSearchParams(window.location.search).get("review");
  return name && name in REVIEW_SHOTS ? REVIEW_SHOTS[name as keyof typeof REVIEW_SHOTS] : null;
}

/** DEV-only: auto-enter play + apply shot weather so ?review=blizzard shows snow. */
export function applyReviewStore(setState: (partial: Record<string, unknown>) => void) {
  const shot = reviewShot();
  if (!shot) return;
  setState({
    started: true,
    paused: false,
    charOpen: false,
    radioOpen: false,
    mapOpen: false,
    weather: shot.weather,
    quality: 1,
    fxOn: true,
  });
}

export function applyReviewCamera(camera: Camera): boolean {
  const shot = reviewShot();
  if (!shot) return false;
  camera.position.set(shot.eye[0], shot.eye[1], shot.eye[2]); camera.lookAt(shot.target[0], shot.target[1], shot.target[2]);
  const c = camera as PerspectiveCamera;
  c.fov = 54; c.updateProjectionMatrix();
  return true;
}
