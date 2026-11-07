import { beforeEach, describe, expect, it } from "vitest";
import manifestRaw from "../../public/tiles/manifest.json?raw";
import { DISTRICTS } from "../districts";
import { FAST_TRAVEL } from "../places";
import { groundCovers } from "../world/corridor";
import {
  getLastGoodPosition,
  getManifestStatus,
  getTileSize,
  hasTileKey,
  isTileMounted,
  liveTileWorld,
  markTileMounted,
  markTileUnmounted,
  NB_SPAWN,
  recordGoodPosition,
  resetSpawnGuardState,
  setTileManifestFailed,
  setTileManifestLoaded,
  SPAWN_GUARD_TIMEOUT_MS,
  SpawnGuard,
  tileKeyFor,
  type TileWorld,
} from "../world/spawnGuard";

// Spawn guard (2026-11-07, Nic's order 16:45 EST): NEVER spawn over void.
// Hold in loading until the ground tile under the spawn point is CONFIRMED
// MOUNTED (its collider RigidBody is in the tree — not merely that the slice
// fetched; Nic's Brockton-void photo proved the slice can be present while
// the 3D world never renders), then safe fallback on timeout. The ground
// plane alone does NOT satisfy the guard. The guard is pure (no React, no
// Rapier): the tile world is injected through the TileWorld seam, and the
// clock is the nowMs argument — no live WebGL session in these tests.

const TILE = 500;

function fakeWorld(mounted: Set<string>, keys: Set<string>, status: "loading" | "loaded" | "failed" = "loaded"): TileWorld {
  return {
    manifestStatus: status,
    hasTileKey: (k) => keys.has(k),
    isTileMounted: (k) => mounted.has(k),
  };
}

describe("tileKeyFor", () => {
  it("uses the streamer's formula (floor(east/500)_floor(north/500), north=-z)", () => {
    expect(tileKeyFor(-256, 106, TILE)).toBe("-1_-1"); // NB spawn
    expect(tileKeyFor(-8280, -49681, TILE)).toBe("-17_99"); // Brockton spawn
    expect(tileKeyFor(53850, -1642, TILE)).toBe("107_3"); // Cape spawn
    expect(tileKeyFor(0, 0, TILE)).toBe("0_0");
  });

  it("returns null without a tile size or with non-finite coords", () => {
    expect(tileKeyFor(-256, 106, null)).toBeNull();
    expect(tileKeyFor(-256, 106, 0)).toBeNull();
    expect(tileKeyFor(NaN, 106, TILE)).toBeNull();
    expect(tileKeyFor(-256, Infinity, TILE)).toBeNull();
  });
});

describe("tile registry", () => {
  beforeEach(() => resetSpawnGuardState());

  it("strict mount check: a tile mounted visual-only does not count", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]);
    markTileMounted("-1_-1", false); // visual-only, no collider
    expect(isTileMounted("-1_-1")).toBe(false);
    markTileMounted("-1_-1", true); // collider RigidBody in the tree
    expect(isTileMounted("-1_-1")).toBe(true);
    markTileUnmounted("-1_-1");
    expect(isTileMounted("-1_-1")).toBe(false);
  });

  it("manifest status + keys are tracked", () => {
    expect(getManifestStatus()).toBe("loading");
    expect(getTileSize()).toBeNull();
    setTileManifestLoaded(TILE, ["-1_-1", "107_3"]);
    expect(getManifestStatus()).toBe("loaded");
    expect(getTileSize()).toBe(TILE);
    expect(hasTileKey("-1_-1")).toBe(true);
    expect(hasTileKey("0_0")).toBe(false);
    setTileManifestFailed();
    expect(getManifestStatus()).toBe("failed");
    expect(hasTileKey("-1_-1")).toBe(false);
  });

  it("last-known-good position is recorded and read back", () => {
    expect(getLastGoodPosition()).toBeNull();
    recordGoodPosition(-256, 106);
    expect(getLastGoodPosition()).toEqual({ x: -256, z: 106 });
  });
});

describe("SpawnGuard hold / release", () => {
  beforeEach(() => resetSpawnGuardState());

  it("holds while the spawn tile is unmounted", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]);
    const mounted = new Set<string>();
    const keys = new Set(["-1_-1"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106 }, 1000);
    expect(g.poll(1000, fakeWorld(mounted, keys))).toEqual({ action: "wait" });
    expect(g.poll(1000 + SPAWN_GUARD_TIMEOUT_MS - 1, fakeWorld(mounted, keys))).toEqual({ action: "wait" });
  });

  it("releases once the spawn tile mounts (with its collider)", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]);
    const mounted = new Set<string>();
    const keys = new Set(["-1_-1"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106 }, 1000);
    expect(g.poll(2000, fakeWorld(mounted, keys))).toEqual({ action: "wait" });
    mounted.add("-1_-1");
    expect(g.poll(2000, fakeWorld(mounted, keys))).toEqual({
      action: "release",
      position: { x: -256, z: 106 },
      mode: "foot",
    });
  });

  it("releases immediately when the spawn tile is already mounted (no added delay)", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]);
    const mounted = new Set(["-1_-1"]);
    const keys = new Set(["-1_-1"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106 }, 1000);
    // Same tick as the arm — no hold time at all when the tile is already there.
    expect(g.poll(1000, fakeWorld(mounted, keys))).toEqual({
      action: "release",
      position: { x: -256, z: 106 },
      mode: "foot",
    });
  });

  it("a spawn whose tile is visual-only (no collider) keeps holding", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]);
    // Visual-only mount is recorded in the real registry as false; the fake
    // world mirrors it by not containing the key in the mounted set.
    const mounted = new Set<string>();
    const keys = new Set(["-1_-1"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106 }, 1000);
    expect(g.poll(2000, fakeWorld(mounted, keys))).toEqual({ action: "wait" });
  });

  it("re-arming replaces a pending hold (Continue-restore re-arms the initial spawn)", () => {
    setTileManifestLoaded(TILE, ["-1_-1", "107_3"]);
    const mounted = new Set<string>(["107_3"]); // only the Cape tile is up
    const keys = new Set(["-1_-1", "107_3"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106 }, 1000); // NB — unmounted, holds
    expect(g.poll(1500, fakeWorld(mounted, keys))).toEqual({ action: "wait" });
    g.beginSpawn({ x: 53850, z: -1642 }, 2000); // re-arm to Cape — mounted
    expect(g.poll(2000, fakeWorld(mounted, keys))).toEqual({
      action: "release",
      position: { x: 53850, z: -1642 },
      mode: "foot",
    });
  });

  it("mode 'car' is preserved through release", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]);
    const mounted = new Set(["-1_-1"]);
    const keys = new Set(["-1_-1"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106, mode: "car" }, 1000);
    expect(g.poll(1000, fakeWorld(mounted, keys))).toEqual({
      action: "release",
      position: { x: -256, z: 106 },
      mode: "car",
    });
  });

  it("the live tile world reads the real registry", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]);
    markTileMounted("-1_-1", true);
    const w = liveTileWorld();
    expect(w.manifestStatus).toBe("loaded");
    expect(w.hasTileKey("-1_-1")).toBe(true);
    expect(w.isTileMounted("-1_-1")).toBe(true);
  });
});

describe("SpawnGuard timeout fallback", () => {
  beforeEach(() => resetSpawnGuardState());

  it("falls back to the last known-good position when its tile is mounted", () => {
    setTileManifestLoaded(TILE, ["-1_-1", "107_3"]);
    recordGoodPosition(-256, 106); // NB, tile mounted
    const mounted = new Set(["-1_-1"]); // Cape tile never mounts
    const keys = new Set(["-1_-1", "107_3"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: 53850, z: -1642, districtSpawn: { x: 53850, z: -1642 } }, 1000);
    const r = g.poll(1000 + SPAWN_GUARD_TIMEOUT_MS, fakeWorld(mounted, keys));
    expect(r).toEqual({
      action: "fallback",
      position: { x: -256, z: 106 },
      mode: "foot",
      tileMounted: true,
      reason: "tile-timeout:last-good",
    });
    expect(groundCovers(-256, 106)).toBe(true);
  });

  it("falls back to the district spawn when there is no last-good position", () => {
    setTileManifestLoaded(TILE, ["-1_-1", "107_3"]);
    const mounted = new Set(["-1_-1"]); // NB tile mounted; Cape tile never mounts
    const keys = new Set(["-1_-1", "107_3"]);
    const g2 = new SpawnGuard();
    // Target is Cape; its district spawn is NB (a different point).
    g2.beginSpawn({ x: 53850, z: -1642, districtSpawn: { x: -256, z: 106 } }, 1000);
    const r = g2.poll(1000 + SPAWN_GUARD_TIMEOUT_MS, fakeWorld(mounted, keys));
    expect(r).toEqual({
      action: "fallback",
      position: { x: -256, z: 106 },
      mode: "foot",
      tileMounted: true,
      reason: "tile-timeout:district-spawn",
    });
    expect(groundCovers(-256, 106)).toBe(true);
  });

  it("falls back to the New Bedford backstop when nothing else is mounted", () => {
    setTileManifestLoaded(TILE, ["-1_-1", "107_3"]);
    const mounted = new Set<string>(); // nothing mounted anywhere
    const keys = new Set(["-1_-1", "107_3"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: 53850, z: -1642, districtSpawn: { x: 53850, z: -1642 } }, 1000);
    const r = g.poll(1000 + SPAWN_GUARD_TIMEOUT_MS, fakeWorld(mounted, keys));
    expect(r).toEqual({
      action: "fallback",
      position: { x: NB_SPAWN.x, z: NB_SPAWN.z },
      mode: "foot",
      tileMounted: false,
      reason: "tile-timeout:nb-backstop",
    });
    // The backstop is the region-wide ground plane: always on ground.
    expect(groundCovers(NB_SPAWN.x, NB_SPAWN.z)).toBe(true);
  });

  it("never holds past the timeout bound (5 s)", () => {
    expect(SPAWN_GUARD_TIMEOUT_MS).toBe(5000);
    setTileManifestLoaded(TILE, ["-1_-1"]);
    const mounted = new Set<string>();
    const keys = new Set(["-1_-1"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106 }, 0);
    expect(g.poll(4999, fakeWorld(mounted, keys))).toEqual({ action: "wait" });
    expect(g.poll(5000, fakeWorld(mounted, keys)).action).toBe("fallback");
  });

  it("fallback preserves mode 'car'", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]);
    const mounted = new Set<string>();
    const keys = new Set(["-1_-1"]);
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106, mode: "car" }, 1000);
    const r = g.poll(1000 + SPAWN_GUARD_TIMEOUT_MS, fakeWorld(mounted, keys));
    expect(r.action).toBe("fallback");
    if (r.action === "fallback") expect(r.mode).toBe("car");
  });
});

describe("SpawnGuard fail-closed escapes", () => {
  beforeEach(() => resetSpawnGuardState());

  it("releases immediately when the manifest failed and the plane covers the spawn", () => {
    setTileManifestFailed();
    const g = new SpawnGuard();
    g.beginSpawn({ x: -256, z: 106 }, 1000);
    expect(g.poll(1000, fakeWorld(new Set(), new Set(), "failed"))).toEqual({
      action: "release",
      position: { x: -256, z: 106 },
      mode: "foot",
    });
  });

  it("falls back (never holds forever) when the manifest failed and the spawn is off the plane", () => {
    setTileManifestFailed();
    const g = new SpawnGuard();
    g.beginSpawn({ x: 100000, z: 0 }, 1000); // outside REGION_BOUNDS
    const r = g.poll(1000, fakeWorld(new Set(), new Set(), "failed"));
    expect(r.action).toBe("fallback");
    if (r.action === "fallback") {
      expect(r.position).toEqual({ x: NB_SPAWN.x, z: NB_SPAWN.z });
      expect(groundCovers(r.position.x, r.position.z)).toBe(true);
    }
  });

  it("releases immediately when the spawn has no tile key in the manifest (e.g. Westport)", () => {
    setTileManifestLoaded(TILE, ["-1_-1"]); // spawn tile never baked
    const g = new SpawnGuard();
    // Westport-adjacent: inside the plane, no tile key.
    g.beginSpawn({ x: -27000, z: -4000 }, 1000);
    expect(g.poll(1000, fakeWorld(new Set(), new Set(["-1_-1"])))).toEqual({
      action: "release",
      position: { x: -27000, z: -4000 },
      mode: "foot",
    });
  });
});

describe("manifest precondition (real manifest.json)", () => {
  it("every fast-travel point and every district spawn has a baked tile key", () => {
    const manifest = JSON.parse(manifestRaw as unknown as string) as { tile: number; keys: string[] };
    const keys = new Set(manifest.keys);
    expect(manifest.tile).toBe(TILE);
    expect(keys.size).toBeGreaterThan(1000);
    // Westport is the KNOWN exception (corridor carve-out): its tile
    // (-27_-4) was never baked, so it has no tile key in the manifest.
    // The guard's no-tile escape covers it — release as soon as the plane
    // covers it — so the precondition is: every point EITHER has a baked
    // tile OR is the known Westport exception with ground under it.
    const missing: string[] = [];
    for (const p of FAST_TRAVEL) {
      const key = tileKeyFor(p.pos[0], p.pos[1], manifest.tile);
      expect(key, `fast-travel ${p.name} at ${p.pos}`).not.toBeNull();
      if (!keys.has(key as string)) missing.push(p.name);
      expect(groundCovers(p.pos[0], p.pos[1]), `fast-travel ${p.name} off ground`).toBe(true);
    }
    expect(missing).toEqual(["Westport"]);
    for (const [id, d] of Object.entries(DISTRICTS)) {
      const key = tileKeyFor(d.spawn[0], d.spawn[1], manifest.tile);
      expect(key, `district ${id} spawn`).not.toBeNull();
      expect(keys.has(key as string), `district ${id} spawn tile ${key} missing`).toBe(true);
      expect(groundCovers(d.spawn[0], d.spawn[1]), `district ${id} spawn off ground`).toBe(true);
    }
  });

  it("the New Bedford backstop itself has a baked tile", () => {
    const manifest = JSON.parse(manifestRaw as unknown as string) as { tile: number; keys: string[] };
    const key = tileKeyFor(NB_SPAWN.x, NB_SPAWN.z, manifest.tile);
    expect(new Set(manifest.keys).has(key as string)).toBe(true);
  });
});
