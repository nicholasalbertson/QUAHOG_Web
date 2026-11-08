// Rapier contact wiring (§1.9.7 / §3.3.6) — Mount Hope checklist.
//
// §1.9.7 "Impact via Rapier contact events; threshold curve by relative
// speed": the player car's impacts with live StreetLife traffic cars are
// driven by REAL Rapier contacts (world.contactPairsWith on the player
// car's collider), not by the distance probes Car.tsx uses for walls.
// The threshold curve is the one §9.1.4 already landed for sfx —
// intensity = |relative speed| / top speed, 0 below the 6 m/s ram gate,
// clamped to 1 — so a contact and a probe-ram produce identical effects.
//
// Dedup: both the contact path here and Car.tsx's probe ram gate on the
// traffic car's `stop` timer (stop > 0 ⇒ already handled). Whichever fires
// first in a frame sets `stop`; the other sees it and skips. No double
// damage, no double sfx. The probe ram stays for walls/furniture/parked
// cars (not StreetLife actors); retiring it in favour of contacts is a
// future Car.tsx pass, flagged in the report.
//
// §3.3.6 "Rapier collision cop↔player (§1.9)": the cop-contact resolver
// is implemented (heat + alarm + crash + damage), but no police collider
// is registered — POLICE_ENABLED is false and Police.tsx has no RigidBody,
// so the branch is inert until police are enabled and cop cars register
// their collider handles via registerPoliceCollider(). Flagged, not faked.
//
// MOUNT: <ContactWiring /> must live inside <Physics> (it reads the
// Rapier world via useRapier). Mount it in Experience.tsx next to
// <TrafficColliders />. It renders nothing.

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRapier, type RapierCollider } from "@react-three/rapier";
import { shared, addShake, addImpact, raiseAlarm, type TrafficCar } from "../shared";
import { sfx } from "../audio/sfx";
import { useGame } from "../store";
import { useStats } from "../game";
import { trafficCarAt } from "../world/StreetLife";

type RapierWorld = ReturnType<typeof useRapier>["world"];

// --- §1.9.7 threshold curve (matches Car.tsx: MAX_SPEED 32, ram gate 6) ---

/** Below this relative speed a contact is a nudge, not an impact. */
export const IMPACT_SPEED_THRESHOLD = 6; // m/s
/** Top speed the curve normalises against (Car.tsx MAX_SPEED). */
export const IMPACT_TOP_SPEED = 32; // m/s
/** Car damage per traffic-car impact (matches Car.tsx's probe ram). */
export const TRAFFIC_DAMAGE = 11;
/** Seconds a rammed traffic car stays halted (matches Car.tsx). */
export const TRAFFIC_STOP_SECONDS = 1.6;
/** How close a contact body's centre must be to a traffic car to count as it. */
export const TRAFFIC_MATCH_RADIUS = 2.6; // m (collider half-length 2.1 + margin)
/** Camera shake on a traffic impact (matches Car.tsx's probe ram). */
export const TRAFFIC_SHAKE = 0.35;

/**
 * §1.9.7 threshold curve: impact intensity 0..1 by relative speed.
 * 0 at or below the 6 m/s gate, then linear to 1 at 32 m/s, clamped.
 * Same curve §9.1.4 landed for sfx.crash()/bump().
 */
export function impactIntensity(relSpeedMs: number): number {
  if (!(relSpeedMs > IMPACT_SPEED_THRESHOLD)) return 0;
  return THREE.MathUtils.clamp(relSpeedMs / IMPACT_TOP_SPEED, 0, 1);
}

// --- §1.9.7: player car ↔ traffic car (StreetLife actor) -------------------

/**
 * Apply the game effects of a Rapier contact between the player car and a
 * live traffic car. Mirrors Car.tsx's probe ram exactly (shake, crash sfx,
 * +11 damage, 1.6 s halt) so the two paths are behaviourally identical.
 * The `tc.stop` gate dedupes against the probe ram: if the car is already
 * stopped (handled this contact) nothing fires again.
 */
export function resolveTrafficImpact(
  tc: TrafficCar,
  playerSpeedMs: number,
  at: THREE.Vector3,
): { fired: boolean; intensity: number } {
  if (tc.stolen || tc.stop > 0) return { fired: false, intensity: 0 };
  const intensity = impactIntensity(playerSpeedMs);
  if (intensity <= 0) return { fired: false, intensity: 0 };
  tc.stop = Math.max(tc.stop, TRAFFIC_STOP_SECONDS);
  shared.carDamage = Math.min(100, shared.carDamage + TRAFFIC_DAMAGE);
  addShake(TRAFFIC_SHAKE);
  sfx.crash(intensity);
  addImpact(at, "#d8d8d8");
  return { fired: true, intensity };
}

// --- §3.3.6: cop car ↔ player ----------------------------------------------

/** Collider handles of live police units, registered by the Police module
 *  when it mounts cop cars. Empty while POLICE_ENABLED is false. */
const policeColliderHandles = new Set<number>();

/** Register a police unit's collider handle so cop↔player contacts resolve. */
export function registerPoliceCollider(handle: number): void {
  policeColliderHandles.add(handle);
}

/** Unregister a police unit's collider handle (unit despawned). */
export function unregisterPoliceCollider(handle: number): void {
  policeColliderHandles.delete(handle);
}

/** True when a collider handle belongs to a registered police unit. */
export function isPoliceCollider(handle: number): boolean {
  return policeColliderHandles.has(handle);
}

/**
 * §3.3.6: a cop car ramming the player is a witnessed collision — it
 * raises wanted heat and scatters nearby peds, plus the usual crash
 * effects (shake, sfx, damage). Inert until a police collider is
 * registered (see registerPoliceCollider).
 */
export function resolveCopImpact(
  playerSpeedMs: number,
  at: THREE.Vector3,
): { fired: boolean; intensity: number } {
  const intensity = impactIntensity(playerSpeedMs);
  if (intensity <= 0) return { fired: false, intensity: 0 };
  // Witnessed crime + collision: same heat/alarm as the ped run-over.
  useStats.getState().heat(0.6, 0.7);
  raiseAlarm(at.x, at.z, 5);
  addShake(TRAFFIC_SHAKE);
  sfx.crash(intensity);
  shared.carDamage = Math.min(100, shared.carDamage + TRAFFIC_DAMAGE);
  return { fired: true, intensity };
}

// --- Contact polling (the live wiring) -------------------------------------

/** Find the player car's collider by its parent body handle (cached). */
function findPlayerCollider(world: RapierWorld, carHandle: number): RapierCollider | null {
  let found: RapierCollider | null = null;
  world.forEachCollider((c) => {
    if (found) return;
    if (c.parent()?.handle === carHandle) found = c;
  });
  return found;
}

/**
 * Polls the Rapier world's contact pairs for the player car every frame
 * (only while driving, above the impact threshold) and resolves each
 * StreetLife traffic-car contact through resolveTrafficImpact, and each
 * registered police contact through resolveCopImpact.
 *
 * Mount inside <Physics> next to <TrafficColliders />. Renders nothing.
 */
export function ContactWiring() {
  const { world } = useRapier();
  const playerCollider = useRef<RapierCollider | null>(null);
  const playerHandle = useRef<number | null>(null);

  useFrame(() => {
    if (!world) return;
    if (useGame.getState().paused) return;
    if (useGame.getState().mode !== "car") return;
    const car = shared.car;
    if (!car || !car.isEnabled()) return;
    const speed = Math.abs(shared.carSpeed);
    if (speed <= IMPACT_SPEED_THRESHOLD) return;

    // Resolve + cache the player car's collider (re-resolve if the car body
    // was replaced, e.g. after a steal / respawn).
    if (!playerCollider.current || playerHandle.current !== car.handle) {
      playerCollider.current = findPlayerCollider(world, car.handle);
      playerHandle.current = car.handle;
      if (!playerCollider.current) return;
    }
    const pc = playerCollider.current;
    const cp = car.translation();

    // Real Rapier contacts involving the player car (narrow phase, not a
    // distance probe). The ground is always in contact and is skipped
    // below (fixed body, never a traffic car).
    world.contactPairsWith(pc, (other) => {
      const body = other.parent();
      if (!body || body.handle === car.handle) return;

      // Live traffic car: a kinematic body following a shared.traffic car.
      // Parked cars / buildings / ground are fixed bodies and never match.
      if (body.isKinematic()) {
        const t = body.translation();
        const tc = trafficCarAt(t.x, t.z, TRAFFIC_MATCH_RADIUS);
        if (tc) {
          const at = new THREE.Vector3((cp.x + t.x) / 2, 1.0, (cp.z + t.z) / 2);
          resolveTrafficImpact(tc, speed, at);
        }
        return;
      }

      // Registered police unit (§3.3.6). Inert while no cop collider exists.
      if (isPoliceCollider(other.handle)) {
        const t = body.translation();
        const at = new THREE.Vector3((cp.x + t.x) / 2, 1.0, (cp.z + t.z) / 2);
        resolveCopImpact(speed, at);
      }
    });
  });

  return null;
}
