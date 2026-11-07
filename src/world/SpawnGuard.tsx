// Spawn guard — runtime glue + <SpawnGuard /> component (see spawnGuard.ts
// for the pure decision logic). One singleton guard, ticked from Experience's
// useFrame loop.
//
// The hold sits here: every spawn (cross-district fast travel in App.tsx
// onReady, same-district fast travel in BigMap.tsx, the Continue-restore in
// GameSystems.tsx, and the initial spawn armed on mount) goes through
// requestGuardedSpawn(), which parks both bodies DISABLED at the target.
// The tick re-asserts the park and polls the tile registry; only when the
// tile under the spawn is confirmed mounted (its <Tile> mounted with its
// collider) does the guard enable the bodies and set the mode — the moment
// the player gains control. On timeout (5 s) it falls back and releases
// there instead. The player and car can never be enabled over void.
//
// On-foot spawns are covered: the guard holds the PLAYER body, not just
// the car (Nic's Brockton-void photo was Franklin on foot). While held,
// Player/Car useFrame early-return on isSpawnHeld(), so no input or
// velocity can queue up behind the hold.

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DISTRICTS } from "../districts";
import { shared } from "../shared";
import { useGame, useToasts } from "../store";
import { perfStats } from "../ui/perfStats";
import { DEBUG_API_TOKEN, DEBUG_BEACON_PATH } from "../debug/endpoint";
import { buildBeaconPayload, type BeaconInput } from "../debug/modelStatus";
import {
  SpawnGuard as SpawnGuardMachine,
  getLastGoodPosition,
  getTileSize,
  isTileMounted,
  liveTileWorld,
  recordGoodPosition,
  tileKeyFor,
  type SpawnTarget,
} from "./spawnGuard";

const guard = new SpawnGuardMachine();

/** True while a spawn is held (bodies parked, player has no control). */
export function isSpawnHeld(): boolean {
  return guard.state === "holding";
}

function parkBody(
  body: { setTranslation: (p: { x: number; y: number; z: number }, wake: boolean) => void; setLinvel: (v: { x: number; y: number; z: number }, wake: boolean) => void; setEnabled: (v: boolean) => void } | null,
  x: number,
  y: number,
  z: number,
): void {
  if (!body) return;
  body.setTranslation({ x, y, z }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setEnabled(false);
}

/** Park both bodies at the spawn target and arm the hold. The tick keeps
 *  re-asserting the park until the guard releases, so bodies that appear
 *  late (or a re-armed hold) are covered too. */
export function requestGuardedSpawn(target: SpawnTarget): void {
  const districtSpawn = target.districtSpawn ?? (() => {
    const d = DISTRICTS[useGame.getState().district];
    return { x: d.spawn[0], z: d.spawn[1] };
  })();
  guard.beginSpawn({ ...target, districtSpawn }, performance.now());
  const t = guard.target;
  if (!t) return;
  if (t.mode === "car") {
    // Restore-into-car: the player rides at the car position, disabled.
    parkBody(shared.car, t.x, 1.4, t.z);
    parkBody(shared.player, t.x, 2, t.z);
  } else {
    parkBody(shared.player, t.x, 2, t.z);
    parkBody(shared.car, t.carTarget.x, 1.4, t.carTarget.z);
  }
}

function releaseAt(position: { x: number; z: number }, mode: "foot" | "car"): void {
  const t = guard.target;
  const carTarget = t?.carTarget ?? { x: position.x + 6, z: position.z + 4 };
  const game = useGame.getState();
  if (mode === "car") {
    // Player stays disabled at the car position; the car is the body.
    parkBody(shared.player, position.x, 2, position.z);
    if (shared.car) {
      shared.car.setTranslation({ x: position.x, y: 1.4, z: position.z }, true);
      shared.car.setLinvel({ x: 0, y: 0, z: 0 }, true);
      shared.car.setEnabled(true);
    }
    game.setMode("car");
  } else {
    if (shared.player) {
      shared.player.setTranslation({ x: position.x, y: 2, z: position.z }, true);
      shared.player.setLinvel({ x: 0, y: 0, z: 0 }, true);
      shared.player.setEnabled(true);
    }
    if (shared.car) {
      shared.car.setTranslation({ x: carTarget.x, y: 1.4, z: carTarget.z }, true);
      shared.car.setLinvel({ x: 0, y: 0, z: 0 }, true);
      shared.car.setEnabled(true);
    }
    game.setMode("foot");
  }
  recordGoodPosition(position.x, position.z);
  guard.release();
}

/** Log a fallback through the debug channel: console.error (captured by the
 *  debug overlay's ring buffer and shipped on the next beacon) AND a
 *  one-shot beacon with the same payload shape the overlay uses. Plus a
 *  toast, so Nic sees WHY he ended up somewhere other than where he tapped. */
function logFallback(reason: string, target: { x: number; z: number }, fallback: { x: number; z: number }, tileMounted: boolean): void {
  const msg = `spawn-guard fallback: ${reason} target=(${Math.round(target.x)},${Math.round(target.z)}) fallback=(${Math.round(fallback.x)},${Math.round(fallback.z)}) tileMounted=${tileMounted}`;
  console.error(`[spawn-guard] ${msg}`);
  try {
    const game = useGame.getState();
    const pl = shared.player?.translation();
    const input: BeaconInput = {
      buildId: `${__BUILD_SHA__} · ${__BUILD_DATE__}`,
      ts: Date.now(),
      mode: game.mode,
      pos: pl ? { x: pl.x, y: pl.y, z: pl.z } : null,
      speed: 0,
      headingDeg: Math.round((shared.heading * 180) / Math.PI),
      carType: game.playerCarType,
      carModel: "",
      damage: shared.carDamage,
      objective: "",
      objectiveDist: null,
      fps: 0,
      draws: perfStats.draws,
      tris: perfStats.tris,
      geometries: perfStats.geometries,
      textures: perfStats.textures,
      quality: game.quality,
      hour: shared.hour,
      traffic: shared.traffic.length,
      parked: shared.parked.length,
      errors: [{ level: "error", msg }],
    };
    const body = JSON.stringify({ token: DEBUG_API_TOKEN, ...buildBeaconPayload(input) });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(DEBUG_BEACON_PATH, new Blob([body], { type: "application/json" }));
    } else {
      fetch(DEBUG_BEACON_PATH, { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* telemetry must never break the game */
  }
  useToasts.getState().push("SAFE SPAWN — the ground didn't load, moved you somewhere solid", "#ff6a6a");
}

export function SpawnGuard() {
  const acc = useRef(0);
  const lastGoodAcc = useRef(0);
  const initialArmed = useRef(false);

  // The initial spawn is a spawn too: arm the hold on the first frame the
  // bodies exist. Invisible behind the start menu — by the time Nic presses
  // Play, the New Bedford tile is mounted and the bodies are released.
  useEffect(() => {
    return () => {
      // No teardown: the singleton guard outlives the component (Experience
      // never unmounts it mid-session; a remount re-arms on first frame).
    };
  }, []);

  useFrame((_, dt) => {
    // Arm the initial spawn once, as soon as the bodies exist.
    if (!initialArmed.current && shared.player && shared.car) {
      initialArmed.current = true;
      if (guard.state === "idle") {
        requestGuardedSpawn({ x: -256.2, z: 106.5 });
      }
    }

    acc.current += dt;
    if (acc.current < 0.1) return; // poll at 10 Hz — the tile mount lands within ~100 ms
    acc.current = 0;
    const now = performance.now();

    if (guard.state === "holding" && guard.target) {
      const t = guard.target;
      // Re-assert the park every tick: the bodies cannot drift, fall, or
      // be moved by input while the world under them is unconfirmed.
      if (t.mode === "car") {
        parkBody(shared.car, t.x, 1.4, t.z);
        parkBody(shared.player, t.x, 2, t.z);
      } else {
        parkBody(shared.player, t.x, 2, t.z);
        parkBody(shared.car, t.carTarget.x, 1.4, t.carTarget.z);
      }
      const res = guard.poll(now, liveTileWorld());
      if (res.action === "release") {
        releaseAt(res.position, res.mode);
      } else if (res.action === "fallback") {
        const targetPos = { x: t.x, z: t.z };
        releaseAt(res.position, res.mode);
        logFallback(res.reason, targetPos, res.position, res.tileMounted);
      }
      return;
    }

    // Idle: record the last known-good position (1 Hz) whenever the player
    // is enabled and standing on a mounted tile — the fallback chain's
    // first candidate.
    lastGoodAcc.current += 0.1;
    if (lastGoodAcc.current < 1) return;
    lastGoodAcc.current = 0;
    const pl = shared.player;
    if (!pl || !pl.isEnabled()) return;
    const p = pl.translation();
    const tileSize = getTileSize();
    const key = tileKeyFor(p.x, p.z, tileSize);
    if (key !== null && isTileMounted(key)) recordGoodPosition(p.x, p.z);
  });

  return null;
}

// Re-exported for tests / debugging convenience.
export { getLastGoodPosition };
