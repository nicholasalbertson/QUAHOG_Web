import * as THREE from "three";
import { SLICE_ORIGIN, type LatLon } from "./geo";

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
  /** Live ENU anchor in degrees. Rebase moves this; teleport resets it. */
  anchor: { ...SLICE_ORIGIN } as LatLon,
  /** False until the rig has a real pose, so a save can't record the zero vector. */
  settled: false,
  /** 0 day, 1 night. EarthSimBridge writes this from the sim hour. */
  night: 0,
  /** Pause freezes the rig. The menu sets it; the frame loop also stops. */
  paused: false,
  /** Crimes queued this moment. The bridge turns them into police stars. */
  infractions: 0,
  /** True while braking, so the tail lights can brighten without a re-render. */
  braking: false,
  /** How many times the local frame has moved under the player this session. */
  rebases: 0,
  /** Rolling frame rate and the quality tier, for the performance line. */
  fps: 0,
  tier: "high" as "high" | "medium" | "low",
  /** Car condition, 0–100. The rig spends it on hard hits. */
  condition: { body: 100, engine: 100 },
  /** Seconds R has been held while stopped, toward a repair. */
  repair: 0,
  /** Drivable polylines in the current local frame. Traffic publishes these. */
  routes: [] as { pts: { x: number; z: number }[]; total: number }[],
  peds: [] as Body[],
  cars: [] as Body[],
  bump: 0, // set when the player's car hits an NPC car (PlayerRig reads + clears)
};

let lastCrime = 0;

/** Record one infraction, ignoring repeats inside the cooldown. */
export function noteCrime(cooldown = 1.25): boolean {
  const now = performance.now() / 1000;
  if (now - lastCrime < cooldown) return false;
  lastCrime = now;
  playState.infractions += 1;
  return true;
}

export function resetBodies() {
  playState.peds = [];
  playState.cars = [];
}
