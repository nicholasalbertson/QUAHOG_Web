import { useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { TilesRendererContext } from "3d-tiles-renderer/r3f";
// Rigid primitive humanoid, NOT the skinned CesiumMan: at the photoreal tiles'
// earth-centered coordinates (~6.3M m from origin) GPU skinning shatters in
// float32, so the skinned model explodes into shards. Rigid meshes render
// camera-relative and stay crisp (same reason the car looks fine).
import { assignPedLooks } from "../world/pedLooks";
import { PedestrianAI, type PedAgent } from "../sim/PedestrianAI";
import { sim } from "../sim/SimRuntime";
import { sfx } from "../audio/sfx";
import { surfaceAt } from "../world/surfaceSample";
import type { Road } from "../slice";
import { Character } from "../world/Character";
import { slewHeading, stepJump, type JumpState } from "../world/locomotion";
import { consumeTap, isDown, moveAxis } from "../input";
import { DRIVABLE, followCam, forwardHit, frameUp, groundY, lerpAngle, sanitizePosition } from "./follow";
import { EARTH_TUNING, chaseForSpeed, stepEarthDrive } from "./drive";
import { NPC_GROUND_INTERVAL_S, WALL_INTERVAL_S, tileCollision } from "./raycastBudget";
import { playState, resetBodies, type Body } from "./playState";
import { VEHICLE_TYPES } from "./vehicleTypes";
import { TrafficPackCar } from "../actors/TrafficPackCar";
import { PackGLB } from "../actors/PackGLB";
import type { Slice } from "../slice";

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

const CAR_COLORS = ["#9c3a3a", "#2f6f7a", "#caa24a", "#3a5a9c", "#5a5a5a"];

// §2.7.3 — 50 peds visible in earth play mode. (Ped palette moved to
// src/world/pedLooks.ts, which assigns the 3 builds + colors.)
export const EARTH_PED_COUNT = 50;

const planar = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

// ---------------------------------------------------------------------------
// Player: on foot + drivable car, wall-collided, with 1st/3rd-person views.

export function PlayerRig({ spawn, view, onReady, roads, wet }: {
  spawn: Spawn;
  view: View;
  onReady?: () => void;
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
    carPos: new THREE.Vector3(spawn.x + 5, 0, spawn.z),
    carYaw: spawn.heading,
  });

  useFrame((state, dt) => {
    const parent = player.current?.parent;
    if (!parent) return;
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
        () => groundY(parent, tiles?.group, tileCollision.ray, st.pos.x, st.pos.z, up),
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
        camera.up.copy(up);
        camera.position.copy(parent.localToWorld(_probe.set(st.pos.x, 90, st.pos.z + 1)));
        camera.lookAt(parent.localToWorld(_dir.set(st.pos.x, 0, st.pos.z)));
        return;
      }
    }
    if (car.current) car.current.visible = true;

    const ax = moveAxis();
    const fwd = _fwd.set(Math.sin(st.camYaw), 0, Math.cos(st.camYaw));
    const right = _right.set(fwd.z, 0, -fwd.x);

    if (st.mode === "foot") {
      if (player.current) player.current.visible = view === "third";
      const dir = _dir.set(0, 0, 0).addScaledVector(fwd, ax.y).addScaledVector(right, ax.x);
      const sprinting = isDown("ShiftLeft") || isDown("ShiftRight");
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
            sfx.step(surfaceAt(st.pos.x, -st.pos.z, !!wet, roads ?? null));
          }
        }
      } else { st.moving = false; st.speed = 0; }

      const gy = tileCollision.sampleGround("player", now,
        () => groundY(parent, tiles?.group, tileCollision.ray, st.pos.x, st.pos.z, up),
        { priority: true });
      if (gy !== null) {
        // §2.4.5 — jump (Space, foot mode only): the player rises above the
        // sampled tile ground and lands back on it.
        stepJump(st.jump, step, isDown("Space"));
        st.pos.y = gy + st.jump.y;
      }

      // pushed by passing NPC cars; push pedestrians out of the way
      for (const c of playState.cars) {
        const d = planar(st.pos, c.pos);
        if (d > 1e-3 && d < 1.6) st.pos.addScaledVector(awayXZ(st.pos, c.pos), 1.6 - d);
      }
      knockPeds(st.pos, 0.9);

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
        if (best) { best.hit += 1; best.push.addScaledVector(awayXZ(best.pos, st.pos), 1.0); }
      }

      player.current!.position.copy(st.pos);
      player.current!.rotation.y = st.heading;
      car.current!.position.copy(st.carPos);
      car.current!.rotation.y = st.carYaw;
      car.current!.rotation.z = 0;
      if (consumeTap("KeyE") && planar(st.pos, st.carPos) < 5.5) { st.mode = "car"; sfx.door(); }

      st.camYaw = lerpAngle(st.camYaw, st.heading, 1 - Math.exp(-step * 3));
      if (view === "third") followCam(camera, parent, up, st.pos, st.camYaw, 7, 4, 1 - Math.exp(-step * 6));
      else firstPerson(camera, parent, up, st.pos, st.heading, 1.7);
      playState.player.driving = false;
      // §2.9.3 — no engine hum on foot.
      sfx.engine(0, false);
      playState.player.pos.copy(st.pos);
      // §2.8 — full pose for the shared sim (nav + missions): heading is the
      // movement heading, speed is the gait speed (0 when idle).
      playState.player.heading = st.heading;
      playState.player.speed = st.moving ? (st.speed >= 2 ? 9 : 4.5) : 0;
      // §2.5.5 — distance to the car, for the "E — Enter car" prompt.
      playState.player.carDist = planar(st.pos, st.carPos);
    } else {
      if (player.current) player.current.visible = false;
      const driven = stepEarthDrive(
        { yaw: st.carYaw, speed: st.carSpeed, skidding: false },
        ax,
        step,
        { handbrake: isDown("Space"), wet: !!wet },
      );
      st.carYaw = driven.yaw;
      st.carSpeed = driven.speed;
      const cf = _fwd.set(Math.sin(st.carYaw), 0, Math.cos(st.carYaw));

      const moveDist = st.carSpeed * step;
      if (Math.abs(moveDist) > 1e-3) {
        const pdir = _dir.copy(cf).multiplyScalar(Math.sign(st.carSpeed));
        const probe = tileCollision.sampleWall("player-wall", now,
          () => forwardHit(parent, tiles?.group, tileCollision.ray, _probe.copy(st.carPos).setY(st.carPos.y + 1.0), pdir, Math.abs(moveDist) + 2.6),
          { priority: true, interval: WALL_INTERVAL_S });
        if (probe < Math.abs(moveDist) + 2.4) st.carSpeed *= 0.2; // bump, don't tunnel
        else st.carPos.addScaledVector(cf, moveDist);
      }
      const gy = tileCollision.sampleGround("player", now,
        () => groundY(parent, tiles?.group, tileCollision.ray, st.carPos.x, st.carPos.z, up),
        { priority: true });
      if (gy !== null) st.carPos.y = gy;

      // bump other vehicles
      for (const c of playState.cars) {
        const d = planar(st.carPos, c.pos);
        if (d > 1e-3 && d < 3.4) {
          const away = awayXZ(c.pos, st.carPos);
          c.push.addScaledVector(away, 3.4 - d);
          st.carPos.addScaledVector(away, -(3.4 - d) * 0.5);
          st.carSpeed *= -0.25;
          playState.bump = 1;
        }
      }
      knockPeds(st.carPos, 1.9);

      car.current!.position.copy(st.carPos);
      car.current!.rotation.y = st.carYaw;
      const lean = Math.min(1, Math.abs(st.carSpeed) / 20);
      car.current!.rotation.z = -ax.x * lean * (driven.skidding ? 0.09 : 0.045);
      st.pos.copy(st.carPos);
      if (consumeTap("KeyE")) {
        st.mode = "foot";
        sfx.door();
        const r = _dir.set(cf.z, 0, -cf.x);
        st.pos.set(st.carPos.x + r.x * 3, st.carPos.y, st.carPos.z + r.z * 3);
        st.carSpeed = 0;
      }
      // §2.9.3 — engine hum (speed fraction of the 22 m/s earth car max)
      // + horn on H, matching the stylized car.
      sfx.engine(Math.min(1, Math.abs(st.carSpeed) / EARTH_TUNING.maxSpeed), true);
      if (consumeTap("KeyH")) sfx.horn();
      const chase = chaseForSpeed(st.carSpeed);
      st.camYaw = lerpAngle(st.camYaw, st.carYaw, 1 - Math.exp(-step * chase.follow));
      if (view === "third") followCam(camera, parent, up, st.carPos, st.camYaw, chase.dist, chase.height, 1 - Math.exp(-step * chase.follow));
      else firstPerson(camera, parent, up, _probe.copy(st.carPos).addScaledVector(cf, 0.2), st.carYaw, 1.6);
      playState.player.driving = true;
      playState.player.pos.copy(st.carPos);
      // §2.8 — full pose for the shared sim (nav + missions).
      playState.player.heading = st.carYaw;
      playState.player.speed = Math.abs(st.carSpeed);
    }

    // §2.1.4 — NaN guard: a non-finite transform resets to spawn instead of
    // flying the camera/player to infinity.
    sanitizePosition(st.pos, spawn);
    sanitizePosition(st.carPos, spawn);
    playState.settled = true;
  });

  return (
    <>
      <group ref={player}>
        <Character moving={() => s.current.moving} speed={() => s.current.speed} airborne={() => !s.current.jump.grounded} shirt="#2f5fae" pants="#23262e" />
      </group>
      <group ref={car}>
        {/* Stream A (2026-11-03): pack GLB instead of the procedural Vehicle.
            NOTE: <Character> above is deliberately NOT replaced — the file
            header documents that skinned models shatter at earth-centred
            coordinates in float32, so the rigid primitive humanoid stays. */}
        <TrafficPackCar
          pack="/packs/pack006/sports_coupe.glb"
          wheelR={0.33}
          getSpeed={() => s.current.carSpeed}
        />
      </group>
    </>
  );
}

function knockPeds(center: THREE.Vector3, r: number) {
  for (const p of playState.peds) {
    const d = planar(center, p.pos);
    if (d > 1e-3 && d < r) p.push.addScaledVector(awayXZ(p.pos, center), r - d + 0.05);
  }
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
const NPC_PACKS = [
  "/packs/pack006/sports_coupe.glb",
  "/packs/pack006/mid_sedan.glb",
  "/packs/pack006/offroad_suv.glb",
];

// ---------------------------------------------------------------------------
// NPCs: pedestrians + traffic on the real roads, with contact knockback.

interface Route { pts: THREE.Vector3[]; total: number }

export function TileNpcs({ slice, center }: { slice: Slice; center: [number, number] }) {
  const tiles = useContext(TilesRendererContext);

  const routes = useMemo<Route[]>(() => {
    const out: Route[] = [];
    for (const r of slice.roads) {
      if (!DRIVABLE.has(r.highway) || r.points.length < 2) continue;
      const pts = r.points.map(([e, n]) => new THREE.Vector3(e, 0, -n));
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) total += pts[i].distanceTo(pts[i + 1]);
      if (total > 12) out.push({ pts, total });
    }
    return out;
  }, [slice]);

  const pedRefs = useRef<(THREE.Group | null)[]>([]);
  const carRefs = useRef<(THREE.Group | null)[]>([]);
  // §2.7.3 — 50 peds. Looks come from assignPedLooks (3 builds cycling, so
  // no two adjacent peds are ever identical); the ground-sample budget
  // (CollisionBudget, cap 4/frame, 0.5 s interval) covers 50 peds at ~100/s.
  const pedLooks = useMemo(() => assignPedLooks(EARTH_PED_COUNT), []);
  const peds = useRef(
    Array.from({ length: EARTH_PED_COUNT }, (_, i) => ({
      pos: rand(center, 30), goal: rand(center, 30), heading: 0, y: 0, t: Math.random(),
      down: 0, dead: false,
      shirt: pedLooks[i].shirt, pants: pedLooks[i].pants, skin: pedLooks[i].skin,
      build: pedLooks[i].build,
      body: { pos: new THREE.Vector3(), push: new THREE.Vector3(), hit: 0 } as Body,
    })),
  );
  const cars = useRef(
    Array.from({ length: 3 }, () => ({
      route: routes.length ? Math.floor(Math.random() * routes.length) : 0,
      fwd: Math.random() < 0.5, dist: 0, y: 0, t: Math.random(), heading: 0,
      offset: new THREE.Vector3(), color: pick(CAR_COLORS), vtype: pick(VEHICLE_TYPES),
      body: { pos: new THREE.Vector3(), push: new THREE.Vector3(), hit: 0 } as Body,
    })),
  );

  // §2.7.2 — the peds walk the SHARED PedGraph (sim.sidewalkGraph, built
  // from the slice roads by sim.bindSlice) via the shared PedestrianAI —
  // the same class the stylized StreetLife uses. When the graph is bound,
  // goals come from sidewalk nodes and the ped follows the graph route;
  // when it is not yet bound (first frames), the AI falls back to open
  // wander, so the peds still move.
  const pedAi = useRef(new PedestrianAI({ wander: 32, speed: 1.4 }));
  const agents = useRef<PedAgent[]>([]);
  if (agents.current.length === 0) {
    agents.current = peds.current.map((p, i) => ({
      id: i, x: p.pos.x, z: p.pos.z, goalX: p.goal.x, goalZ: p.goal.z,
      heading: 0, down: 0, dead: false, path: null, pathCursor: 0,
    }));
  }

  useEffect(() => {
    playState.peds = peds.current.map((p) => p.body);
    playState.cars = cars.current.map((c) => c.body);
    return () => resetBodies();
  }, []);

  useFrame((state, dt) => {
    const parent = (pedRefs.current[0] || carRefs.current[0])?.parent;
    if (!parent) return;
    const step = Math.min(dt, 0.05);
    parent.updateWorldMatrix(true, false);
    const up = frameUp(parent);
    // §2.1.1 — NPC ground samples share the frame budget (non-priority, so a
    // crowd can't stampede the BVH); PlayerRig already began this frame.
    const now = state.clock.elapsedTime;
    tileCollision.beginFrame(now);

    // §2.7.2 — drive the peds through the shared PedestrianAI: sync each
    // agent from its ped (melee pushes + down/dead state), then let the AI
    // move them along the shared PedGraph (or open wander when the graph
    // is not yet bound). 2 ms budget for the AI tick.
    const ai = pedAi.current;
    ai.setCenter({ x: center[0], z: center[1] });
    ai.setGraph(sim.sidewalkGraph);
    peds.current.forEach((p, i) => {
      const ag = agents.current[i];
      if (!ag) return;
      ag.x = p.pos.x;
      ag.z = p.pos.z;
      ag.down = p.down;
      ag.dead = p.dead;
    });
    ai.update(step, { x: playState.player.pos.x, z: playState.player.pos.z }, agents.current, 2, null);
    peds.current.forEach((p, i) => {
      const ag = agents.current[i];
      if (!ag) return;
      p.pos.x = ag.x;
      p.pos.z = ag.z;
      p.goal.x = ag.goalX;
      p.goal.z = ag.goalZ;
      p.heading = ag.heading;
    });

    peds.current.forEach((p, i) => {
      const g = pedRefs.current[i];
      if (!g) return;

      // resolve melee hits: first hit = knocked out, hit again = killed
      if (p.body.hit > 0) {
        if (p.dead) { /* already down for good */ }
        else if (p.down > 0) p.dead = true;
        else p.down = 4;
        p.body.hit = 0;
      }
      if (p.dead || p.down > 0) {
        if (p.down > 0) p.down -= step;
        g.position.set(p.pos.x, p.y, p.pos.z);
        g.rotation.set(Math.PI / 2, p.heading, 0); // lying on the ground
        p.body.pos.set(p.pos.x, p.y, p.pos.z);
        return;
      }

      if (p.body.push.lengthSq() > 0) { p.pos.add(p.body.push); p.body.push.set(0, 0, 0); }
      // §2.7.2 — movement is driven by the shared PedestrianAI (above);
      // the ped's position + heading now come from its agent.
      p.t -= step;
      if (p.t <= 0 && tiles?.group) {
        p.t = 0.5 + Math.random() * 0.5;
        const gy = tileCollision.sampleGround(`ped-${i}`, now,
          () => groundY(parent, tiles.group, tileCollision.ray, p.pos.x, p.pos.z, up),
          { interval: NPC_GROUND_INTERVAL_S });
        if (gy !== null) p.y = gy;
      }
      g.position.set(p.pos.x, p.y, p.pos.z);
      g.rotation.set(0, p.heading, 0);
      p.body.pos.set(p.pos.x, p.y, p.pos.z);
    });

    if (routes.length) {
      cars.current.forEach((c, i) => {
        const g = carRefs.current[i];
        if (!g) return;
        const route = routes[c.route % routes.length];
        c.dist += 9 * step;
        if (c.dist >= route.total) { c.fwd = !c.fwd; c.dist = 0; c.route = Math.floor(Math.random() * routes.length); }
        const along = c.fwd ? c.dist : route.total - c.dist;
        const { point, dir } = sampleAlong(routes[c.route % routes.length], along, _alongPoint, _alongDir);
        if (c.body.push.lengthSq() > 0) { c.offset.add(c.body.push); c.body.push.set(0, 0, 0); }
        c.offset.multiplyScalar(0.9);
        const px = point.x + c.offset.x, pz = point.z + c.offset.z;
        c.t -= step;
        if (c.t <= 0 && tiles?.group) {
          c.t = 0.4 + Math.random() * 0.5;
          const gy = tileCollision.sampleGround(`car-${i}`, now,
            () => groundY(parent, tiles.group, tileCollision.ray, px, pz, up),
            { interval: NPC_GROUND_INTERVAL_S });
          if (gy !== null) c.y = gy;
        }
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
          <Character shirt={p.shirt} pants={p.pants} skin={p.skin} build={p.build} moving={() => !p.dead && p.down <= 0} />
        </group>
      ))}
      {cars.current.map((c, i) => (
        <group key={`c${i}`} ref={(el) => (carRefs.current[i] = el)}>
          <PackGLB path={NPC_PACKS[i % NPC_PACKS.length]} />
        </group>
      ))}
    </group>
  );
}

function rand(center: [number, number], r: number) {
  return new THREE.Vector3(center[0] + (Math.random() * 2 - 1) * r, 0, center[1] + (Math.random() * 2 - 1) * r);
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function sampleAlong(route: Route, d: number, point: THREE.Vector3, dir: THREE.Vector3) {
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
