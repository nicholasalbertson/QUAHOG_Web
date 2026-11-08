/**
 * §14.6 Cutscene camera spline editor + export cues.
 */

import type { CamKey, AnimCue, CutsceneTrack } from "./CutsceneTracks";

export function insertCamKey(keys: CamKey[], key: CamKey): CamKey[] {
  return [...keys, key].sort((a, b) => a.t - b.t);
}

export function exportCutsceneTrack(
  id: string,
  keys: CamKey[],
  cues: AnimCue[],
  duration: number,
): CutsceneTrack {
  return { id, duration, camera: keys, cues, skippable: true };
}
