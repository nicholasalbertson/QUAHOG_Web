import * as THREE from "three";

// Cross-component contact state for the photoreal play world. PlayerRig writes
// the player/car position each frame; TileNpcs registers its agents' bodies and
// applies any accumulated push (knockback) from contacts. Kept out of React
// state so per-frame writes don't re-render.

export interface Body {
  pos: THREE.Vector3; // content-space position (updated by owner each frame)
  push: THREE.Vector3; // accumulated knockback, applied + cleared by owner
  hit: number; // melee hits queued by the player (consumed by owner)
}

export const playState = {
  // §2.8 — the earth PlayerRig writes the full pose here every frame, so the
  // shared sim (EarthSimBridge) can drive nav/missions/persistence from it
  // without a Rapier body. heading is the movement heading (radians),
  // speed is m/s (0 when idle).
  player: { pos: new THREE.Vector3(), driving: false, heading: 0, speed: 0, carDist: Infinity },
  /** Active photoreal place. EarthApp sets this; saves read it. */
  placeId: "nb-bethel",
  /** False until the rig has a real pose, so a save can't record the zero vector. */
  settled: false,
  peds: [] as Body[],
  cars: [] as Body[],
  bump: 0, // set when the player's car hits an NPC car (PlayerRig reads + clears)
};

export function resetBodies() {
  playState.peds = [];
  playState.cars = [];
}
