import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { TilesRendererContext } from "3d-tiles-renderer/r3f";
// The player and the crowd use the Quaternius rig baked to rigid frames.
// GPU skinning shatters at earth-centered coordinates, so the bake is what
// the tiles build draws. The Kenney car kit replaces the cube placeholder.
import { assignPedLooks } from "../world/pedLooks";
import { sfx } from "../audio/sfx";
import { surfaceAt } from "../world/surfaceSample";
import type { Road } from "../slice";
import { Character } from "../world/Character";
import { LicensedHuman } from "../actors/LicensedHuman";
import { Cc0Vehicle } from "../actors/Cc0Vehicle";
import { slewHeading, stepJump, type JumpState } from "../world/locomotion";
import { consumeTap, gamepadDrive, isDown, moveAxis } from "../input";
import { actionDown, actionTap } from "./controls";
import { followCam, forwardHit, frameUp, groundY, lerpAngle, sanitizePosition } from "./follow";
import { EARTH_TUNING, chaseForSpeed, stepEarthDrive, suspendHeight } from "./drive";
import { NPC_GROUND_INTERVAL_S, WALL_INTERVAL_S, tileCollision } from "./raycastBudget";
import { noteCrime, playState, resetBodies, type Body } from "./playState";
import { CAR_ENTER_M, lampsFromRoutes, parkedCar, planRebase, registerShift, scanRoutes, shiftLocals, type LocalRoute } from "./rebase";
import { stepLanes, followRoad, roadblockPoint, type LaneState } from "./traffic";
import { junctionsFromRoutes, laneOffset, laneShift, pedReaction, signalOpen } from "./signals";
import { applyImpact, powerFor, repairBill } from "./damage";
import { writeEastNorthUp } from "./enuFrame";
import { SLICE_ORIGIN, latLonToLocal, localToLatLon, type LatLon } from "./geo";
import { useStats } from "../game";
import { useToasts } from "../store";
import { shared } from "../shared";

export type View = "third" | "first";
export interface Spawn { x: number; z: number; heading: number }

// §2.1.2 — scratch vectors for the per-frame player math (no allocation in
// the hot loop). follow.ts already owns its own scratch; these are PlayWorld's.
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _pedTo = new THREE.Vector3(); // §12.3.2 — TileNpcs ped steering (was a per-ped-per-frame allocation)
const _away = new THREE.Vector3();
const _fpHead = new THREE.Vector3();
const _fpLook = new THREE.Vector3();
const _fpFwd = new THREE.Vector3();
const _alongPoint = new THREE.Vector3();
const _alongDir = new THREE.Vector3();

const _lead = new THREE.Vector3();

// A small crowd in whichever city is loaded. The old 50-ped New Bedford
// crowd is too many draw calls once tiles are streaming in every city.
export const EARTH_PED_COUNT = 8;
export const EARTH_CAR_COUNT = 4;

const planar = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

// ---------------------------------------------------------------------------
// Player: on foot + drivable car, wall-collided, with 1st/3rd-person views.

export function PlayerRig({ spawn, view, onReady, onAnchor, roads, wet }: {
  spawn: Spawn;
  view: View;
  onReady?: () => void;
  /** Called when the ENU anchor moves. The matrix is already written. */
  onAnchor?: (anchor: LatLon) => void;
  /** §2.9.3 — slice roads for footstep surfaces (surfaceAt); null = grass. */
  roads?: readonly Road[] | null;
  /** §2.9.3 — wet surfaces (rain) for the footstep timbre. */
  wet?: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const tiles = useContext(TilesRendererContext);
  const player = useRef<THREE.Group>(null);
  const car = useRef<THREE.Group>(null);
  // §2.1.1 — ground/wall raycasts go through the shared CollisionBudget
  // (tileCollision.ray), not per-component Raycasters.
  const s = useRef({
    mode: "foot" as "foot" | "car",
    ready: false,
    wait: 0,
    carSpeed: 0,
    pos: new THREE.Vector3(spawn.x, 0, spawn.z),
    heading: spawn.heading,
    camYaw: spawn.heading,
    moving: false,
    // §2.4 — locomotion speed for the Character gait: 0 idle, 1 walk, 2 run.
    speed: 0,
    // §2.9.3 — footstep accumulator: distance (m) since the last step sound.
    stepAcc: 0,
    // §2.4.5 — jump state (y = height above ground, 0 = grounded).
    jump: { y: 0, vy: 0, grounded: true } as JumpState,
    carPos: new THREE.Vector3(parkedCar(spawn).x, 0, parkedCar(spawn).z),
    carYaw: spawn.heading,
    punch: 0,
    board: 0,
    exitWalk: 0,
    screechAt: 0,
    lastHit: 0,
  });

  const spawnRef = useRef(spawn);
  useEffect(() => {
    const prev = spawnRef.current;
    spawnRef.current = spawn;
    if (prev.x === spawn.x && prev.z === spawn.z && prev.heading === spawn.heading) return;
    const st = s.current;
    const wandered = Math.hypot(st.pos.x - prev.x, st.pos.z - prev.z);
    const jump = Math.hypot(spawn.x - st.pos.x, spawn.z - st.pos.z);
    // A late highway snap is a real move. Ignore only a small correction
    // after the player has already walked away from the previous pin.
    if (jump <= 30 && wandered > 12) return;
    const parked = parkedCar(spawn);
    st.pos.set(spawn.x, st.pos.y, spawn.z);
    st.carPos.set(parked.x, st.carPos.y, parked.z);
    st.heading = spawn.heading;
    st.carYaw = spawn.heading;
    st.camYaw = spawn.heading;
  }, [spawn.x, spawn.z, spawn.heading]);

  useFrame((state, dt) => {
    const parent = player.current?.parent;
    if (!parent) return;
    if (playState.paused) return;
    const step = Math.min(dt, 0.05);
    parent.updateWorldMatrix(true, false);
    const up = frameUp(parent);
    const st = s.current;
    // §2.1.1 — one shared raycast budget per frame: the player is priority
    // (always casts), NPCs are sampled + capped. `now` is the R3F clock.
    const now = state.clock.elapsedTime;
    tileCollision.beginFrame(now);

    // spawn gating — hold until tiles exist under the spawn point
    if (!st.ready) {
      const gy = tileCollision.sampleGround("player", now,
        () => groundY(parent, tiles?.group, tileCollision.ray, st.pos.x, st.pos.z, up, st.pos.y),
        { priority: true });
      st.wait += step;
      if (gy !== null) {
        st.pos.y = gy; st.carPos.y = gy; st.ready = true; playState.settled = true; onReady?.();
      } else if (st.wait > 3) {
        // tiles still haven't streamed a surface — don't strand the player in the
        // air; drop near sea level and let per-frame raycasts correct once tiles load
        st.pos.y = 3; st.carPos.y = 3; st.ready = true; playState.settled = true; onReady?.();
      } else {
        if (player.current) player.current.visible = false;
        if (car.current) car.current.visible = false;
        // Stay at street height while the first tiles arrive. A camera 90 m
        // up asks Google for the soft roof mesh and leaves the sky empty.
        followCam(camera, parent, up, st.pos, st.heading, 4.6, 1.65, 1);
        return;
      }
    }
    if (car.current) car.current.visible = true;

    const ax = moveAxis();
    const pad = gamepadDrive();
    const drive = { x: ax.x, y: Math.max(-1, Math.min(1, ax.y + pad.y)) };
    const fwd = _fwd.set(Math.sin(st.camYaw), 0, Math.cos(st.camYaw));
    const right = _right.set(fwd.z, 0, -fwd.x);

    if (st.mode === "foot") {
      if (player.current) player.current.visible = view === "third";
      if (st.punch > 0) st.punch = Math.max(0, st.punch - step);
      const dir = _dir.set(0, 0, 0).addScaledVector(fwd, ax.y).addScaledVector(right, ax.x);
      const sprinting = actionDown("sprint");
      const speed = sprinting ? 9 : 4.5;
      if (dir.lengthSq() > 1e-4) {
        dir.normalize();
        const moveDist = speed * step;
        const probe = tileCollision.sampleWall("player-wall", now,
          () => forwardHit(parent, tiles?.group, tileCollision.ray, _probe.copy(st.pos).setY(st.pos.y + 1.1), dir, moveDist + 0.6),
          { priority: true, interval: WALL_INTERVAL_S });
        const allowed = Math.min(moveDist, Math.max(0, probe - 0.6));
        st.pos.addScaledVector(dir, allowed);
        // §2.4.7 — turn-in-place: the heading slews toward the movement
        // direction at 360°/s (a 180° reversal takes 0.5 s) instead of snapping.
        st.heading = slewHeading(st.heading, Math.atan2(dir.x, dir.z), Math.PI * 2, step);
        st.moving = allowed > 0.001;
        // §2.4 — gait speed: run when sprinting, walk otherwise, idle when stopped.
        st.speed = st.moving ? (sprinting ? 2 : 1) : 0;
        // §2.9.3 — footsteps: one step sound per stride (0.75 m walk,
        // 1.1 m run), with the surface underfoot (road/grass/water).
        if (st.moving) {
          st.stepAcc += allowed;
          const stride = sprinting ? 1.1 : 0.75;
          if (st.stepAcc >= stride) {
            st.stepAcc -= stride;
            const home = latLonToLocal(SLICE_ORIGIN, localToLatLon(playState.anchor, st.pos.x, st.pos.z));
            sfx.step(surfaceAt(home.x, -home.z, !!wet, roads ?? null));
          }
        }
      } else { st.moving = false; st.speed = 0; }

      const gy = tileCollision.sampleGround("player", now,
        () => groundY(parent, tiles?.group, tileCollision.ray, st.pos.x, st.pos.z, up, st.pos.y),
        { priority: true });
      if (gy !== null) {
        // §2.4.5 — jump (Space, foot mode only): the player rises above the
        // sampled tile ground and lands back on it.
        stepJump(st.jump, step, actionDown("handbrake"));
        st.pos.y = gy + st.jump.y;
      }

      // pushed by passing NPC cars; push pedestrians out of the way
      for (const c of playState.cars) {
        const d = planar(st.pos, c.pos);
        if (d > 1e-3 && d < 1.6) st.pos.addScaledVector(awayXZ(st.pos, c.pos), 1.6 - d);
      }
      knockPeds(st.pos, 0.9, false);

      // melee: punch the nearest pedestrian in front (F)
      if (consumeTap("KeyF")) {
        const f = _probe.set(Math.sin(st.heading), 0, Math.cos(st.heading));
        let best: Body | null = null;
        let bestD = 2.0;
        for (const p of playState.peds) {
          const dx = p.pos.x - st.pos.x, dz = p.pos.z - st.pos.z;
          const d = Math.hypot(dx, dz) || 1;
          if (d < bestD && (dx * f.x + dz * f.z) / d > 0.25) { best = p; bestD = d; }
        }
        if (best) {
          best.hit += 1;
          best.push.addScaledVector(awayXZ(best.pos, st.pos), 1.0);
          st.punch = 0.45;
          sfx.punch();
          noteCrime();
        }
      }

      player.current!.position.copy(st.pos);
      player.current!.rotation.y = st.heading;
      car.current!.position.copy(st.carPos);
      car.current!.rotation.y = st.carYaw;
      car.current!.rotation.z = 0;
      if (st.exitWalk > 0) {
        st.exitWalk = Math.max(0, st.exitWalk - step);
        st.moving = true;
        st.speed = Math.max(st.speed, 1);
      } else if (st.board > 0) {
        st.board = Math.max(0, st.board - step);
        st.moving = true;
        st.speed = 1;
        const doorX = st.carPos.x + Math.cos(st.carYaw) * 1.7;
        const doorZ = st.carPos.z - Math.sin(st.carYaw) * 1.7;
        st.pos.x += (doorX - st.pos.x) * (1 - Math.exp(-step * 6));
        st.pos.z += (doorZ - st.pos.z) * (1 - Math.exp(-step * 6));
        st.heading = st.carYaw;
        if (st.board <= 0) { st.mode = "car"; st.moving = false; sfx.door(); }
      } else if (actionTap("interact") && planar(st.pos, st.carPos) < CAR_ENTER_M) {
        st.board = 0.55;
      }

      st.camYaw = lerpAngle(st.camYaw, st.heading, 1 - Math.exp(-step * 3));
      if (view === "third") followCam(camera, parent, up, st.pos, st.camYaw, 4.6, 1.65, 1 - Math.exp(-step * 6));
      else firstPerson(camera, parent, up, st.pos, st.heading, 1.6);
      shared.steerVisual = 0;
      shared.carSpeed = 0;
      const onFoot = camera as THREE.PerspectiveCamera;
      if (onFoot.isPerspectiveCamera && Math.abs(onFoot.fov - 52) > 0.4) {
        onFoot.fov += (52 - onFoot.fov) * (1 - Math.exp(-step * 4));
        onFoot.updateProjectionMatrix();
      }
      playState.player.driving = false;
      playState.braking = false;
      // §2.9.3 — no engine hum on foot.
      sfx.engine(0, false);
      playState.player.pos.copy(st.pos);
      // §2.8 — full pose for the shared sim (nav + missions): heading is the
      // movement heading, speed is the gait speed (0 when idle).
      playState.player.heading = st.heading;
      playState.player.speed = st.moving ? (st.speed >= 2 ? 9 : 4.5) : 0;
      if (st.moving) playState.tutorial.moved = true;
      // §2.5.5 — distance to the car, for the "E — Enter car" prompt.
      playState.player.carDist = planar(st.pos, st.carPos);
    } else {
      if (player.current) player.current.visible = false;
      const driven = stepEarthDrive(
        { yaw: st.carYaw, speed: st.carSpeed, skidding: false },
        drive,
        step,
        { handbrake: actionDown("handbrake"), wet: !!wet, power: powerFor(playState.condition.engine) },
      );
      st.carYaw = driven.yaw;
      st.carSpeed = driven.speed;
      const cf = _fwd.set(Math.sin(st.carYaw), 0, Math.cos(st.carYaw));

      const moveDist = st.carSpeed * step;
      if (Math.abs(moveDist) > 1e-3) {
        const pdir = _dir.copy(cf).multiplyScalar(Math.sign(st.carSpeed));
        const stopAt = Math.abs(moveDist) + 1.15;
        const probe = tileCollision.sampleWall("player-wall", now,
          () => {
            const low = forwardHit(parent, tiles?.group, tileCollision.ray, _probe.copy(st.carPos).setY(st.carPos.y + 0.45), pdir, stopAt + 0.4);
            const high = forwardHit(parent, tiles?.group, tileCollision.ray, _probe.copy(st.carPos).setY(st.carPos.y + 1.15), pdir, stopAt + 0.4);
            // A real wall occupies both heights. A tile crack or a curb does not.
            return low < stopAt && high < stopAt ? Math.min(low, high) : Infinity;
          },
          { priority: true, interval: WALL_INTERVAL_S });
        if (probe < stopAt) {
          // A seam or a guardrail the centerline clips. Scoot out. One hard
          // hit per second and a half, not a crash on every coarse tile.
          if (probe < 0.4) st.carPos.addScaledVector(pdir, -0.3);
          if (Math.abs(st.carSpeed) > 14 && now - st.lastHit > 1.5) {
            sfx.crash(Math.min(1, Math.abs(st.carSpeed) / 24));
            playState.condition = applyImpact(playState.condition, Math.abs(st.carSpeed) * 0.45);
            st.carSpeed *= 0.72;
            st.lastHit = now;
          } else if (Math.abs(st.carSpeed) > 3) {
            st.carSpeed *= 0.985;
          }
        }
        else st.carPos.addScaledVector(cf, moveDist);
      }
      const gy = tileCollision.sampleGround("player", now,
        () => groundY(parent, tiles?.group, tileCollision.ray, st.carPos.x, st.carPos.z, up, st.carPos.y),
        { priority: true });
      if (gy !== null) st.carPos.y = suspendHeight(st.carPos.y, gy, step);

      // bump other vehicles
      for (const c of playState.cars) {
        const d = planar(st.carPos, c.pos);
        if (d > 1e-3 && d < 3.4) {
          const away = awayXZ(c.pos, st.carPos);
          c.push.addScaledVector(away, 3.4 - d);
          st.carPos.addScaledVector(away, -(3.4 - d) * 0.5);
          const impact = Math.abs(st.carSpeed);
          st.carSpeed *= -0.25;
          playState.bump = 1;
          if (impact > 6) {
            sfx.crash(0.45);
            noteCrime();
            playState.condition = applyImpact(playState.condition, impact);
          }
        }
      }
      knockPeds(st.carPos, 1.9, Math.abs(st.carSpeed) > 6);
      playState.braking = drive.y < -0.2 && Math.abs(st.carSpeed) > 1;
      const hurt = playState.condition.body < 100 || playState.condition.engine < 100;
      if (hurt && Math.abs(st.carSpeed) < 0.4 && isDown("KeyR")) {
        playState.repair += step;
        if (playState.repair >= 1.2) {
          const bill = repairBill(playState.condition.body, playState.condition.engine);
          const stats = useStats.getState();
          if (stats.cash >= bill) {
            stats.addCash(-bill);
            playState.condition = { body: 100, engine: 100 };
            playState.career.repairs += 1;
            sfx.cash();
            useToasts.getState().push(bill > 0 ? `Repaired. $${bill}.` : "Repaired.", "#7CFC00");
          } else {
            useToasts.getState().push(`Repair is $${bill}.`, "#ffcf4a");
          }
          playState.repair = 0;
        }
      } else if (!isDown("KeyR")) playState.repair = 0;

      car.current!.position.copy(st.carPos);
      car.current!.rotation.y = st.carYaw;
      const lean = Math.min(1, Math.abs(st.carSpeed) / 20);
      car.current!.rotation.z = -drive.x * lean * (driven.skidding ? 0.09 : 0.045);
      st.pos.copy(st.carPos);
      if (actionTap("interact")) {
        st.mode = "foot";
        sfx.door();
        const r = _dir.set(cf.z, 0, -cf.x);
        st.pos.set(st.carPos.x + r.x * 2.2, st.carPos.y, st.carPos.z + r.z * 2.2);
        st.carSpeed = 0;
        st.exitWalk = 0.4;
        st.moving = true;
        st.speed = 1;
      }
      // §2.9.3 — engine hum (speed fraction of the 22 m/s earth car max)
      // + horn on H, matching the stylized car.
      sfx.engine(Math.min(1, Math.abs(st.carSpeed) / EARTH_TUNING.maxSpeed), true);
      if (driven.skidding && now - st.screechAt > 0.7) { sfx.screech(); st.screechAt = now; }
      if (actionTap("horn")) sfx.horn();
      shared.steerVisual = drive.x * 0.35;
      shared.carSpeed = st.carSpeed;
      const chase = chaseForSpeed(st.carSpeed);
      st.camYaw = lerpAngle(st.camYaw, st.carYaw, 1 - Math.exp(-step * chase.follow));
      if (view === "third") followCam(camera, parent, up, st.carPos, st.camYaw, chase.dist, chase.height, 1 - Math.exp(-step * chase.follow));
      else firstPerson(camera, parent, up, _probe.copy(st.carPos).addScaledVector(cf, 0.2), st.carYaw, 1.2);
      const persp = camera as THREE.PerspectiveCamera;
      if (persp.isPerspectiveCamera) {
        persp.fov += (chase.fov - persp.fov) * (1 - Math.exp(-step * 3));
        persp.updateProjectionMatrix();
      }
      playState.player.driving = true;
      playState.player.pos.copy(st.carPos);
      // §2.8 — full pose for the shared sim (nav + missions).
      playState.player.heading = st.carYaw;
      playState.player.speed = Math.abs(st.carSpeed);
      if (Math.abs(st.carSpeed) > 1) {
        playState.tutorial.drove = true;
        playState.career.drove = true;
      }
    }

    // §2.1.4 — NaN guard: a non-finite transform resets to spawn instead of
    // flying the camera/player to infinity.
    sanitizePosition(st.pos, spawn);
    sanitizePosition(st.carPos, spawn);
    playState.settled = true;
    const active = st.mode === "car" ? st.carPos : st.pos;
    const plan = planRebase(playState.anchor, active.x, active.z);
    const enu = parent.parent;
    if (plan && enu) {
      st.pos.x -= plan.shiftX;
      st.pos.z -= plan.shiftZ;
      st.carPos.x -= plan.shiftX;
      st.carPos.z -= plan.shiftZ;
      playState.player.pos.x -= plan.shiftX;
      playState.player.pos.z -= plan.shiftZ;
      playState.anchor = plan.anchor;
      playState.rebases += 1;
      shiftLocals(plan.shiftX, plan.shiftZ);
      writeEastNorthUp(enu, plan.anchor);
      onAnchor?.(plan.anchor);
    }
  });

  useLayoutEffect(() => {
    const parent = player.current?.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, true);
    const st = s.current;
    followCam(camera, parent, frameUp(parent), st.pos, st.heading, 4.6, 1.65, 1);
  }, [camera]);

  return (
    <>
      <group ref={player}>
        <LicensedHuman
          slot={0}
          gait={() => {
            const st = s.current;
            if (st.punch > 0) return "punch";
            if (!st.jump.grounded) return "jump";
            if (st.speed >= 2) return "run";
            if (st.moving || st.board > 0 || st.exitWalk > 0) return "walk";
            return "idle";
          }}
          fallback={<Character moving={() => s.current.moving} speed={() => s.current.speed} airborne={() => !s.current.jump.grounded} shirt="#2f5fae" pants="#23262e" />}
        />
        <ContactBlob radius={0.42} />
      </group>
      <group ref={car}>
        <Cc0Vehicle slot={0} driven />
        <EarthHeadlights />
        <ContactBlob radius={1.5} />
      </group>
    </>
  );
}

function ContactBlob({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <circleGeometry args={[radius, 20]} />
      <meshBasicMaterial color="#0c0e12" transparent opacity={0.38} depthWrite={false} />
    </mesh>
  );
}

function knockPeds(center: THREE.Vector3, r: number, crime: boolean) {
  let hit = false;
  for (const p of playState.peds) {
    const d = planar(center, p.pos);
    if (d > 1e-3 && d < r) {
      p.push.addScaledVector(awayXZ(p.pos, center), r - d + 0.05);
      hit = true;
    }
  }
  if (hit && crime) noteCrime();
}
function awayXZ(a: THREE.Vector3, b: THREE.Vector3) {
  _away.set(a.x - b.x, 0, a.z - b.z);
  return _away.lengthSq() > 1e-6 ? _away.normalize() : _away.set(1, 0, 0);
}

function firstPerson(camera: THREE.Camera, parent: THREE.Object3D, up: THREE.Vector3, posLocal: THREE.Vector3, heading: number, eye: number) {
  _fpHead.copy(posLocal).setY(posLocal.y + eye);
  _fpFwd.set(Math.sin(heading), 0, Math.cos(heading));
  camera.up.copy(up);
  camera.position.copy(parent.localToWorld(_fpHead));
  camera.lookAt(parent.localToWorld(_fpLook.copy(posLocal).setY(posLocal.y + eye).addScaledVector(_fpFwd, 12)));
}

// Stream A (2026-11-03): the primitive-box CarMesh is deleted. Tile NPC
// cars below render pack GLBs instead (paint is baked, so per-car colour
// is dropped — the same trade-off already accepted for parked pack cars).
// ---------------------------------------------------------------------------
// City life: a small crowd on the active city's roads, lamps, a lookahead
// camera so tiles stream ahead of the car, and a couple of pursuit cruisers.

interface LiveRoute {
  roadIndex: number;
  pts: THREE.Vector3[];
  total: number;
  highway?: string;
  lanes?: number;
  ref?: string;
  control?: "signal" | "stop" | "none";
}

function toLive(list: LocalRoute[]): LiveRoute[] {
  return list.map((route) => ({
    roadIndex: route.roadIndex,
    total: route.total,
    highway: route.highway,
    lanes: route.lanes,
    ref: route.ref,
    control: route.control,
    pts: route.pts.map((p) => new THREE.Vector3(p.x, 0, p.z)),
  }));
}

function publishRoutes(routes: LiveRoute[]) {
  playState.routes = routes.map((route) => ({
    total: route.total,
    highway: route.highway,
    lanes: route.lanes,
    ref: route.ref,
    control: route.control,
    pts: route.pts.map((p) => ({ x: p.x, z: p.z })),
  }));
  playState.junctions = junctionsFromRoutes(playState.routes);
}

function pointOn(routes: LiveRoute[], i: number): THREE.Vector3 {
  if (!routes.length) return new THREE.Vector3((i - 3) * 6, 0, (i % 4) * 5);
  const route = routes[i % routes.length];
  return route.pts[i % route.pts.length].clone();
}

export function CityLife({ roads }: { roads: Road[] | null }) {
  return (
    <>
      <TilePrefetch />
      {roads && roads.length > 0 && <TileNpcs roads={roads} />}
      <StreetLamps roads={roads} />
      <WantedPursuit />
      <SignalPosts />
    </>
  );
}

export function TileNpcs({ roads }: { roads: Road[] }) {
  const tiles = useContext(TilesRendererContext);
  const routesRef = useRef<LiveRoute[]>([]);
  const scanAt = useRef(0);
  const roadsRef = useRef(roads);
  roadsRef.current = roads;

  const pedRefs = useRef<(THREE.Group | null)[]>([]);
  const carRefs = useRef<(THREE.Group | null)[]>([]);
  const pedLooks = useMemo(() => assignPedLooks(EARTH_PED_COUNT), []);
  const peds = useRef(
    Array.from({ length: EARTH_PED_COUNT }, (_, i) => {
      const pos = pointOn(routesRef.current ?? [], i);
      return {
        pos, goal: pos.clone(), heading: 0, y: 0, t: Math.random(),
        down: 0, dead: false, grounded: false,
        shirt: pedLooks[i].shirt, pants: pedLooks[i].pants, skin: pedLooks[i].skin,
        hair: pedLooks[i].hair, hat: pedLooks[i].hat, coat: pedLooks[i].coat,
        build: pedLooks[i].build,
        body: { pos: new THREE.Vector3(), push: new THREE.Vector3(), hit: 0 } as Body,
      };
    }),
  );
  const cars = useRef(
    Array.from({ length: EARTH_CAR_COUNT }, (_, i) => ({
      route: i,
      fwd: i % 2 === 0, dir: (i % 2 === 0 ? 1 : -1) as 1 | -1, dist: 0, hold: 0, lane: i % 2, y: 0, t: Math.random(), heading: 0,
      style: i % 4, grounded: false,
      offset: new THREE.Vector3(),
      body: { pos: new THREE.Vector3(), push: new THREE.Vector3(), hit: 0 } as Body,
    })),
  );

  useEffect(() => {
    playState.peds = peds.current.map((p) => p.body);
    playState.cars = cars.current.map((c) => c.body);
    return registerShift((dx, dz) => {
      for (const ped of peds.current) {
        ped.pos.x -= dx; ped.pos.z -= dz;
        ped.goal.x -= dx; ped.goal.z -= dz;
      }
      const routes = routesRef.current;
      for (const route of routes) for (const pt of route.pts) { pt.x -= dx; pt.z -= dz; }
      routesRef.current = routes.filter((route) => route.pts.some((pt) => Math.hypot(pt.x, pt.z) < 3200));
      scanAt.current = 0;
      publishRoutes(routesRef.current);
    });
  }, []);

  useEffect(() => () => resetBodies(), []);

  useFrame((state, dt) => {
    if (playState.paused) return;
    const parent = (pedRefs.current[0] || carRefs.current[0])?.parent;
    if (!parent) return;
    const routes = routesRef.current;
    const source = roadsRef.current;
    if (source && routes.length < 48) {
      const have = new Set(routes.map((route) => route.roadIndex));
      const scanned = scanRoutes(source, playState.anchor, have, scanAt.current, 36);
      scanAt.current = scanned.next;
      if (scanned.routes.length) {
        routes.push(...toLive(scanned.routes));
        publishRoutes(routes);
      }
    }
    const step = Math.min(dt, 0.05);
    parent.updateWorldMatrix(true, false);
    const up = frameUp(parent);
    const now = state.clock.elapsedTime;
    tileCollision.beginFrame(now);

    peds.current.forEach((p, i) => {
      const g = pedRefs.current[i];
      if (!g) return;
      if (p.body.hit > 0) {
        if (!p.dead) { if (p.down > 0) p.dead = true; else p.down = 4; }
        p.body.hit = 0;
      }
      if (p.dead || p.down > 0) {
        if (p.down > 0) p.down -= step;
        g.position.set(p.pos.x, p.y, p.pos.z);
        g.rotation.set(Math.PI / 2, p.heading, 0);
        p.body.pos.set(p.pos.x, p.y, p.pos.z);
        return;
      }
      if (p.body.push.lengthSq() > 0) { p.pos.add(p.body.push); p.body.push.set(0, 0, 0); }
      const react = pedReaction(
        p.pos,
        cars.current.map((car) => ({ x: car.body.pos.x, z: car.body.pos.z, heading: car.heading, speed: car.hold > 0 ? 0 : 9 })),
      );
      if (react.mode === "step") {
        p.pos.x += react.x * 1.4 * step;
        p.pos.z += react.z * 1.4 * step;
      }
      if (react.mode !== "wait" && routes.length && Math.hypot(p.goal.x - p.pos.x, p.goal.z - p.pos.z) < 1.4) {
        const route = routes[Math.floor(Math.random() * routes.length)];
        const pt = route.pts[Math.floor(Math.random() * route.pts.length)];
        if (Math.hypot(pt.x - playState.player.pos.x, pt.z - playState.player.pos.z) < 480) p.goal.copy(pt);
      }
      _pedTo.set(p.goal.x - p.pos.x, 0, p.goal.z - p.pos.z);
      if (react.mode !== "wait" && _pedTo.lengthSq() > 0.25) {
        _pedTo.normalize();
        p.pos.addScaledVector(_pedTo, 1.35 * step);
        p.heading = Math.atan2(_pedTo.x, _pedTo.z);
      }
      p.t -= step;
      if (p.t <= 0 && tiles?.group) {
        p.t = 0.5 + Math.random() * 0.5;
        const gy = tileCollision.sampleGround(`ped-${i}`, now,
          () => groundY(parent, tiles.group, tileCollision.ray, p.pos.x, p.pos.z, up, p.y),
          { interval: NPC_GROUND_INTERVAL_S });
        if (gy !== null) { p.y = gy; p.grounded = true; }
      }
      g.visible = p.grounded;
      g.position.set(p.pos.x, p.y, p.pos.z);
      g.rotation.set(0, p.heading, 0);
      p.body.pos.set(p.pos.x, p.y, p.pos.z);
    });

    if (routes.length) {
      const lanes: LaneState[] = cars.current.map((c) => ({ route: c.route, dist: c.dist, dir: c.dir, hold: c.hold, lane: c.lane }));
      stepLanes(lanes, routes, step, 9, state.clock.elapsedTime, playState.junctions);
      lanes.forEach((lane, i) => {
        cars.current[i].route = lane.route;
        cars.current[i].dist = lane.dist;
        cars.current[i].dir = lane.dir;
        cars.current[i].hold = lane.hold;
        cars.current[i].lane = lane.lane ?? 0;
        cars.current[i].fwd = lane.dir === 1;
      });
      cars.current.forEach((c, i) => {
        const g = carRefs.current[i];
        if (!g) return;
        const route = routes[c.route % routes.length];
        if (c.hold > 0) {
          g.visible = c.grounded;
          g.position.set(c.body.pos.x, c.y, c.body.pos.z);
          g.rotation.y = c.heading;
          return;
        }
        const along = c.fwd ? c.dist : Math.max(0, route.total - c.dist);
        const { point, dir } = sampleAlong(route, along, _alongPoint, _alongDir);
        const shift = laneShift(dir.x, dir.z, laneOffset(c.lane, route.lanes ?? 1));
        point.x += shift.x;
        point.z += shift.z;
        if (c.body.push.lengthSq() > 0) { c.offset.add(c.body.push); c.body.push.set(0, 0, 0); }
        c.offset.multiplyScalar(0.9);
        const px = point.x + c.offset.x, pz = point.z + c.offset.z;
        c.t -= step;
        if (c.t <= 0 && tiles?.group) {
          c.t = 0.4 + Math.random() * 0.5;
          const gy = tileCollision.sampleGround(`car-${i}`, now,
            () => groundY(parent, tiles.group, tileCollision.ray, px, pz, up, c.y),
            { interval: NPC_GROUND_INTERVAL_S });
          if (gy !== null) { c.y = gy; c.grounded = true; }
        }
        g.visible = c.grounded;
        c.heading = Math.atan2(dir.x, dir.z) + (c.fwd ? 0 : Math.PI);
        g.position.set(px, c.y, pz);
        g.rotation.y = c.heading;
        c.body.pos.set(px, c.y, pz);
      });
    }
  });

  return (
    <group>
      {peds.current.map((p, i) => (
        <group key={`p${i}`} ref={(el) => (pedRefs.current[i] = el)}>
          <LicensedHuman
            slot={i}
            moving={() => !p.dead && p.down <= 0}
            fallback={<Character shirt={p.shirt} pants={p.pants} skin={p.skin} hair={p.hair} hat={p.hat} coat={p.coat} build={p.build} moving={() => !p.dead && p.down <= 0} />}
          />
        </group>
      ))}
      {cars.current.map((_, i) => (
        <group key={`c${i}`} ref={(el) => (carRefs.current[i] = el)}>
          <Cc0Vehicle slot={cars.current[i].style} />
        </group>
      ))}
    </group>
  );
}

function TilePrefetch() {
  const tiles = useContext(TilesRendererContext);
  const cam = useRef<THREE.PerspectiveCamera>(null);
  useEffect(() => {
    const camera = cam.current;
    if (!tiles || !camera) return;
    tiles.setCamera(camera);
    tiles.setResolution(camera, 256, 256);
    return () => { tiles.deleteCamera(camera); };
  }, [tiles]);
  useFrame(() => {
    const camera = cam.current;
    const parent = camera?.parent;
    if (!camera || !parent || playState.paused) return;
    const pose = playState.player;
    const lead = Math.min(700, 140 + pose.speed * 7);
    const heading = pose.heading;
    camera.position.set(
      pose.pos.x + Math.sin(heading) * lead,
      pose.pos.y + 18,
      pose.pos.z + Math.cos(heading) * lead,
    );
    _lead.set(
      pose.pos.x + Math.sin(heading) * (lead + 40),
      pose.pos.y + 2,
      pose.pos.z + Math.cos(heading) * (lead + 40),
    );
    parent.localToWorld(_lead);
    camera.lookAt(_lead);
    camera.updateMatrixWorld();
  });
  return <perspectiveCamera ref={cam} fov={55} near={1} far={900} />;
}

function EarthHeadlights() {
  const left = useRef<THREE.SpotLight>(null);
  const right = useRef<THREE.SpotLight>(null);
  const tails = useRef<THREE.PointLight>(null);
  const lt = useRef<THREE.Object3D>(null);
  const rt = useRef<THREE.Object3D>(null);
  useEffect(() => {
    if (left.current && lt.current) left.current.target = lt.current;
    if (right.current && rt.current) right.current.target = rt.current;
  }, []);
  useFrame(() => {
    const night = playState.night;
    const beam = night * 7;
    if (left.current) left.current.intensity = beam;
    if (right.current) right.current.intensity = beam;
    if (tails.current) tails.current.intensity = playState.braking ? 2.2 : night * 0.45;
  });
  return (
    <>
      <object3D ref={lt} position={[0.32, 0.2, 16]} />
      <object3D ref={rt} position={[-0.32, 0.2, 16]} />
      <spotLight ref={left} position={[0.32, 0.65, 1.3]} angle={0.42} penumbra={0.55} distance={42} color="#fff1cc" intensity={0} />
      <spotLight ref={right} position={[-0.32, 0.65, 1.3]} angle={0.42} penumbra={0.55} distance={42} color="#fff1cc" intensity={0} />
      <pointLight ref={tails} position={[0, 0.5, -2.1]} color="#ff2a2a" distance={7} intensity={0} />
    </>
  );
}

const LAMP_COUNT = 6;

function StreetLamps({ roads }: { roads: Road[] | null }) {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const spots = useRef<{ x: number; z: number }[]>([]);
  const acc = useRef(0);
  useEffect(() => registerShift((dx, dz) => {
    for (const spot of spots.current) { spot.x -= dx; spot.z -= dz; }
  }), []);
  useFrame((_, dt) => {
    acc.current -= dt;
    if (acc.current <= 0) {
      acc.current = 0.6;
      const pose = playState.player;
      spots.current = lampsFromRoutes(playState.routes, pose.pos.x, pose.pos.z, LAMP_COUNT);
    }
    const night = playState.night;
    for (let i = 0; i < LAMP_COUNT; i++) {
      const light = lights.current[i];
      const spot = spots.current[i];
      if (!light) continue;
      light.intensity = spot ? night * 2.4 : 0;
      if (spot) light.position.set(spot.x, 7.5, spot.z);
    }
  });
  return (
    <>
      {Array.from({ length: LAMP_COUNT }, (_, i) => (
        <pointLight key={i} ref={(el) => { lights.current[i] = el; }} color="#ffc98a" distance={34} decay={2} intensity={0} />
      ))}
    </>
  );
}

function SignalPosts() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const list = playState.junctions;
    for (let i = 0; i < 8; i++) {
      const mesh = refs.current[i];
      const junction = list[i];
      if (!mesh) continue;
      if (!junction || junction.kind === "none") { mesh.visible = false; continue; }
      mesh.visible = true;
      mesh.position.set(junction.x, 3.2, junction.z);
      const open = junction.kind === "signal" && signalOpen(junction.id, clock.elapsedTime, 0);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.set(junction.kind === "stop" ? "#c23b3b" : open ? "#3dba6a" : "#d2a03a");
    }
  });
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <boxGeometry args={[0.4, 1.2, 0.4]} />
          <meshBasicMaterial color="#c23b3b" />
        </mesh>
      ))}
    </>
  );
}

function WantedPursuit() {
  const tiles = useContext(TilesRendererContext);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const cars = useRef([0, 1].map(() => ({ active: false, x: 0, z: 0, y: 0, yaw: 0, t: 0, bite: 0 })));
  useEffect(() => registerShift((dx, dz) => {
    for (const car of cars.current) { car.x -= dx; car.z -= dz; }
  }), []);
  useFrame((state, dt) => {
    if (playState.paused) return;
    const step = Math.min(dt, 0.05);
    const stars = useStats.getState().police;
    const want = stars >= 3 ? 2 : stars >= 0.8 ? 1 : 0;
    sfx.siren(want > 0);
    const parent = refs.current[0]?.parent;
    const up = parent ? frameUp(parent) : null;
    const now = state.clock.elapsedTime;
    cars.current.forEach((car, i) => {
      const group = refs.current[i];
      if (!group) return;
      if (i >= want) { car.active = false; group.visible = false; return; }
      if (!car.active) {
        const heading = playState.player.heading;
        car.x = playState.player.pos.x - Math.sin(heading) * (32 + i * 14);
        car.z = playState.player.pos.z - Math.cos(heading) * (32 + i * 14);
        car.yaw = heading;
        car.active = true;
      }
      const px = playState.player.pos.x;
      const pz = playState.player.pos.z;
      const dx = px - car.x;
      const dz = pz - car.z;
      const dist = Math.hypot(dx, dz) || 1;
      const block = stars >= 3 && i === 0 ? roadblockPoint(playState.routes, px, pz, playState.player.heading, 45) : null;
      if (block) {
        const bd = Math.hypot(block.x - car.x, block.z - car.z);
        if (bd < 3.5) car.yaw = block.yaw;
        else {
          car.yaw = lerpAngle(car.yaw, Math.atan2(block.x - car.x, block.z - car.z), 1 - Math.exp(-step * 2.4));
          car.x += Math.sin(car.yaw) * 16 * step;
          car.z += Math.cos(car.yaw) * 16 * step;
        }
      } else {
        const speed = dist < 9 ? 7 : 15 + Math.min(5, stars) * 1.6;
        const next = followRoad(playState.routes, car.x, car.z, car.yaw, px, pz, step, speed);
        car.x = next.x;
        car.z = next.z;
        car.yaw = next.yaw;
      }
      car.t -= step;
      if (car.t <= 0 && parent && up && tiles?.group) {
        car.t = 0.45;
        const gy = tileCollision.sampleGround(`pursuit-${i}`, now,
          () => groundY(parent, tiles.group, tileCollision.ray, car.x, car.z, up, car.y),
          { interval: NPC_GROUND_INTERVAL_S });
        if (gy !== null) car.y = gy;
      }
      if (dist < 6) {
        playState.bump = 1;
        if (car.bite <= 0) {
          car.bite = 2;
          const stats = useStats.getState();
          const next = stats.health - 8;
          if (next <= 0) {
            stats.setHealth(40);
            stats.heat(-5, 0);
            stats.addCash(-Math.round(stats.cash * 0.1));
            useToasts.getState().push("Busted. They took a cut and cut you loose.", "#ff8a8a");
            sfx.crash(0.7);
            car.active = false;
          } else {
            stats.setHealth(next);
          }
        }
      }
      car.bite = Math.max(0, car.bite - step);
      group.visible = true;
      group.position.set(car.x, car.y, car.z);
      group.rotation.y = car.yaw;
    });
  });
  return (
    <>
      {[0, 1].map((i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <Cc0Vehicle slot={3} />
          <group position={[1.8, 0, 0]}>
            <LicensedHuman slot={i + 1} moving={() => false} fallback={null} scale={1} />
          </group>
        </group>
      ))}
    </>
  );
}

function sampleAlong(route: LiveRoute, d: number, point: THREE.Vector3, dir: THREE.Vector3) {
  const pts = route.pts;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = pts[i].distanceTo(pts[i + 1]);
    if (acc + seg >= d || i === pts.length - 2) {
      const t = seg > 1e-4 ? THREE.MathUtils.clamp((d - acc) / seg, 0, 1) : 0;
      point.lerpVectors(pts[i], pts[i + 1], t);
      dir.subVectors(pts[i + 1], pts[i]).normalize();
      return { point, dir };
    }
    acc += seg;
  }
  return { point: point.copy(pts[0]), dir: dir.set(0, 0, 1) };
}
