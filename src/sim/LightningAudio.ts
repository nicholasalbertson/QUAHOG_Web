/**
 * §1.4.10 / §9.1 Thunder hook for lightning flashes.
 */

import { spatialAudio } from "../audio/SpatialAudio";

export function playThunderNear(x: number, z: number, intensity = 0.4): boolean {
  return spatialAudio.playAt(x, 40, z, {
    duration: 0.55,
    freq: 80 + intensity * 40,
    gain: 0.2 * intensity,
  });
}
