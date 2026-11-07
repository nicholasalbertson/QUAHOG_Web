// Spawn guard (2026-11-07, Nic's order 16:45 EST — front of corridor work).
// The fast-travel fall-through was STILL reproducing on live b6a9f9c: Nic fell
// through the ground in Hyannis, Brockton, etc. after fast travel. The
// corridor build widens the ground plane, but the guard is the explicit
// rule, in Nic's words:
//   1. NEVER spawn over void.
//   2. Hold in loading until the ground tile under the spawn point is
//      CONFIRMED MOUNTED.
//   3. Safe fallback if the tile fails.
//
// "Confirmed mounted" means the tile's <Tile> component has mounted (its
// collider RigidBody is in the tree) — NOT merely that the slice fetched.
// Nic's Brockton-void photo proved the slice can be present (the minimap
// shows the roads) while the 3D world never renders. The tile mount is the
// only signal that the world at the spawn actually exists. The ground plane
// alone does NOT satisfy the guard: it is static and always "there", so
// checking it proves nothing about whether the streaming world caught up.
//
// Two fail-closed escapes so the guard can never hold forever or yank the
// player for a data reason:
//   - If the tile manifest failed to load, or the spawn has no tile key in
//     it (e.g. Westport, whose tile was never baked), there is no tile to
//     wait for — the slice fallback + ground plane are the ground truth,
//     so the guard releases as soon as groundCovers(target) holds.
//   - On timeout the guard falls back (last known-good position, then the
//     target district's spawn, then the New Bedford spawn) and releases
//     there; the region-wide ground plane is the final backstop.
//
// This module is pure (no React, no store, no Rapier) so the decision logic
// is unit-testable with a fake tile world. The runtime glue (parking bodies,
// the useFrame tick, the debug beacon) lives in SpawnGuard.tsx.

import { DISTRICTS } from "../districts";
import { groundCovers } from "./corridor";

/** Bounded wait for a spawn tile to mount. Long enough for a cold tile
 *  fetch on a phone, short enough that a stuck spawn is obvious. */
export const SPAWN_GUARD_TIMEOUT_MS = 5000;

/** The known-good spawn: the New Bedford waterfront, the game's original
 *  spawn point. Inside REGION_BOUNDS (groundCovers) and covered by a tile. */
export const NB_SPAWN: { x: number; z: number } = {
  x: DISTRICTS.newBedford.spawn[0],
  z: DISTRICTS.newBedford.spawn[1],
};

export type SpawnGuardMode = "foot" | "car";

export interface SpawnTarget {
  x: number;
  z: number;
  mode?: SpawnGuardMode;
  /** Fallback target if the spawn tile never mounts: the target district's
   *  default spawn. Defaults to the New Bedford spawn. */
  districtSpawn?: { x: number; z: number };
  /** Where the car parks on release (foot mode). Defaults to x+6, z+4. */
  carTarget?: { x: number; z: number };
}

// ---------------------------------------------------------------------------
// Tile world registry (fed by StreamingBuildings; read by the guard).
// ---------------------------------------------------------------------------

export type ManifestStatus = "loading" | "loaded" | "failed";

interface TileWorldState {
  status: ManifestStatus;
  tileSize: number | null;
  keys: Set<string>;
  /** Mounted tile keys -> mounted WITH a collider RigidBody (the spawn tile
   *  is always a collider tile: it is the player's own tile, distance 0,
   *  inside COLLIDE_R). A tile mounted without colliders is recorded as
   *  false — the guard requires the collider variant (fail-closed). */
  mounted: Map<string, boolean>;
  lastGood: { x: number; z: number } | null;
}

const state: TileWorldState = {
  status: "loading",
  tileSize: null,
  keys: new Set(),
  mounted: new Map(),
  lastGood: null,
};

/** StreamingBuildings calls this when tiles/manifest.json loads. */
export function setTileManifestLoaded(tileSize: number, keys: string[]): void {
  state.status = "loaded";
  state.tileSize = tileSize;
  state.keys = new Set(keys);
}

/** StreamingBuildings calls this when tiles/manifest.json fails. */
export function setTileManifestFailed(): void {
  state.status = "failed";
  state.tileSize = null;
  state.keys = new Set();
}

export function getManifestStatus(): ManifestStatus {
  return state.status;
}

export function getTileSize(): number | null {
  return state.tileSize;
}

/** Tile key for a world point, using the streamer's formula
 *  (StreamingBuildings.tsx): `${floor(east / tile)}_${floor(north / tile)}`
 *  with north = -z. Null while the manifest hasn't loaded. */
export function tileKeyFor(x: number, z: number, tileSize: number | null = getTileSize()): string | null {
  if (tileSize === null || tileSize <= 0 || !Number.isFinite(x) || !Number.isFinite(z)) return null;
  return `${Math.floor(x / tileSize)}_${Math.floor(-z / tileSize)}`;
}

/** True when the spawn tile key exists in the loaded manifest. */
export function hasTileKey(key: string): boolean {
  return state.keys.has(key);
}

/** <Tile> calls this on mount (and re-runs if its collider flag flips). */
export function markTileMounted(key: string, collide: boolean): void {
  state.mounted.set(key, collide);
}

/** <Tile> calls this on unmount. */
export function markTileUnmounted(key: string): void {
  state.mounted.delete(key);
}

/** Strict mount check: the tile is mounted WITH its collider RigidBody.
 *  A tile mounted visual-only does not count — the guard is fail-closed. */
export function isTileMounted(key: string): boolean {
  return state.mounted.get(key) === true;
}

/** The last position the player was recorded standing on a mounted tile
 *  (the guard's first fallback candidate). */
export function recordGoodPosition(x: number, z: number): void {
  state.lastGood = { x, z };
}

export function getLastGoodPosition(): { x: number; z: number } | null {
  return state.lastGood;
}

/** Test-only reset (vitest runs each file in a fresh module registry, but
 *  tests within a file share it). */
export function resetSpawnGuardState(): void {
  state.status = "loading";
  state.tileSize = null;
  state.keys = new Set();
  state.mounted.clear();
  state.lastGood = null;
}

// ---------------------------------------------------------------------------
// Guard state machine.
// ---------------------------------------------------------------------------

export type GuardPollResult =
  | { action: "wait" }
  | { action: "release"; position: { x: number; z: number }; mode: SpawnGuardMode }
  | {
      action: "fallback";
      position: { x: number; z: number };
      mode: SpawnGuardMode;
      /** True when the fallback position's tile is itself mounted. False
       *  only for the final New Bedford backstop, where the region-wide
       *  ground plane is what catches the player. */
      tileMounted: boolean;
      reason: string;
    };

export interface TileWorld {
  manifestStatus: ManifestStatus;
  hasTileKey: (key: string) => boolean;
  isTileMounted: (key: string) => boolean;
}

/** The live tile world, read from the module registry. Tests pass fakes. */
export function liveTileWorld(): TileWorld {
  return {
    manifestStatus: getManifestStatus(),
    hasTileKey,
    isTileMounted,
  };
}

export class SpawnGuard {
  state: "idle" | "holding" = "idle";
  target: { x: number; z: number; mode: SpawnGuardMode; districtSpawn: { x: number; z: number }; carTarget: { x: number; z: number } } | null = null;
  deadlineMs = 0;

  /** (Re-)arm the hold for a spawn. Re-arming replaces a pending hold
   *  (the Continue-restore re-arms the initial-spawn hold). */
  beginSpawn(target: SpawnTarget, nowMs: number): void {
    const mode = target.mode ?? "foot";
    const districtSpawn = target.districtSpawn ?? NB_SPAWN;
    this.target = {
      x: target.x,
      z: target.z,
      mode,
      districtSpawn,
      carTarget: target.carTarget ?? { x: target.x + 6, z: target.z + 4 },
    };
    this.deadlineMs = nowMs + SPAWN_GUARD_TIMEOUT_MS;
    this.state = "holding";
  }

  /** One poll tick. Pure: all world reads go through `world`. */
  poll(nowMs: number, world: TileWorld): GuardPollResult {
    if (this.state !== "holding" || !this.target) return { action: "wait" };
    const t = this.target;
    const key = tileKeyFor(t.x, t.z, world.manifestStatus === "loaded" ? getTileSize() : null);

    // No tile will ever mount for this spawn: the manifest failed, or the
    // spawn has no tile key in it. The slice fallback + ground plane are
    // the ground truth here — release as soon as the plane covers it.
    if (world.manifestStatus === "failed") {
      return groundCovers(t.x, t.z)
        ? { action: "release", position: { x: t.x, z: t.z }, mode: t.mode }
        : this.fallback(world, "manifest-failed-off-ground");
    }
    if (world.manifestStatus === "loaded" && key !== null && !world.hasTileKey(key)) {
      return groundCovers(t.x, t.z)
        ? { action: "release", position: { x: t.x, z: t.z }, mode: t.mode }
        : this.fallback(world, "no-tile-for-spawn-off-ground");
    }

    // The normal path: the spawn tile exists — wait for it to mount.
    if (key !== null && world.isTileMounted(key)) {
      return { action: "release", position: { x: t.x, z: t.z }, mode: t.mode };
    }
    if (nowMs >= this.deadlineMs) return this.fallback(world, "tile-timeout");
    return { action: "wait" };
  }

  /** Fallback chain: last known-good position, then the target district's
   *  spawn, then the New Bedford spawn (the plane backstop). The first
   *  candidate whose tile is mounted wins; if none is mounted, New
   *  Bedford anyway — never hold forever, never spawn over void. */
  fallback(world: TileWorld, reason: string): GuardPollResult {
    const t = this.target;
    if (!t) return { action: "wait" };
    const mode = t.mode;
    const candidates: { pos: { x: number; z: number }; label: string }[] = [];
    const lastGood = getLastGoodPosition();
    if (lastGood) candidates.push({ pos: lastGood, label: "last-good" });
    candidates.push({ pos: t.districtSpawn, label: "district-spawn" });
    for (const c of candidates) {
      const k = tileKeyFor(c.pos.x, c.pos.z, getTileSize());
      if (k !== null && world.isTileMounted(k)) {
        return { action: "fallback", position: c.pos, mode, tileMounted: true, reason: `${reason}:${c.label}` };
      }
    }
    return {
      action: "fallback",
      position: { x: NB_SPAWN.x, z: NB_SPAWN.z },
      mode,
      tileMounted: false,
      reason: `${reason}:nb-backstop`,
    };
  }

  release(): void {
    this.state = "idle";
    this.target = null;
    this.deadlineMs = 0;
  }
}
