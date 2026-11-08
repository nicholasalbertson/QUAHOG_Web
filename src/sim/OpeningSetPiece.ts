/**
 * §8.6.2 Authored opening fish-pier set piece (data stub).
 */

import type { CutsceneTrack } from "./CutsceneTracks";

export const FISH_PIER_OPENING: CutsceneTrack = {
  id: "fish-pier-opening",
  duration: 12,
  skippable: true,
  camera: [
    { t: 0, x: -280, y: 8, z: 90, lookX: -260, lookY: 2, lookZ: 120 },
    { t: 6, x: -250, y: 4, z: 110, lookX: -240, lookY: 1.5, lookZ: 130 },
    { t: 12, x: -240, y: 2.2, z: 122, lookX: -230, lookY: 1.2, lookZ: 128 },
  ],
  cues: [
    { t: 1, entityId: "ferryman", clip: "wave" },
    { t: 4, entityId: "player", clip: "look" },
    { t: 9, entityId: "marker", clip: "pulse" },
  ],
};

export const FISH_PIER_MARKERS = [
  { id: "pier-start", x: -260, z: 120, label: "Fish Pier" },
  { id: "pier-boat", x: -245, z: 135, label: "Skiff" },
];
