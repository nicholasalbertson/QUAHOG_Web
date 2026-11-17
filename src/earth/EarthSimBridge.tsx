// Earth ↔ shared sim bridge (§2.8, §2.11.4).
//
// The earth build boots from the SAME sim layer as the stylized build —
// SimBootstrap/RoadGraph/PedGraph/MissionRuntime/SaveGame via the `sim`
// singleton. Nothing here duplicates the sim stack; this file only ADAPTS
// earth's own state (playState pose, earth weather, earth HUD) into the
// shared sim's inputs and reads its outputs back out.
//
// Contents:
// - EarthSimBridge: binds the slice, runs the fixed-step loop + clock,
//   drives nav (setNavGoal/tickNav) from the earth player pose, and
//   publishes shared.nav* for the HUD (§2.5.6).
// - EarthMissionRunner: the mission completion check (§2.8.1) — same rule
//   as the stylized MissionRunner (src/sim/missionComplete.ts), rewards
//   via useStats, toasts via useToasts, and the objective marker.
// - saveEarth / loadEarthPos / restoreEarth: persistence parity (§2.8.4)
//   — same keys + shapes as the stylized build (SAVE_KEYS.mission,
//   SAVE_KEYS.pos, stats, economy), so a save made in earth resumes in
//   either build and canContinue() understands it.

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sim } from "../sim/SimRuntime";
import { stepComplete } from "../sim/missionComplete";
import { shared } from "../shared";
import { useMission } from "../mission";
import { useStats } from "../game";
import { useEconomy } from "../economy";
import { useToasts } from "../store";
import { sfx } from "../audio/sfx";
import { playState } from "./playState";
import { advanceArc, arcDistance, arcIndex, currentArc, finishArc, loadArc } from "./arc";
import { advanceJob, chasePoint, currentJob, jobClock, jobSnapshot, loadJobs, tickJob } from "./jobs";
import { LicensedHuman } from "../actors/LicensedHuman";
import { Character } from "../world/Character";
import { bedFor } from "./ambience";
import { nearestCity } from "./regions";
import { straightGuide } from "./rebase";
import { anchorIsSliceOrigin, latLonToLocal, localToLatLon, sliceToLatLon, type LatLon } from "./geo";
import { sunDayFactor } from "./dayNight";
import { markerFade } from "../world/markerVisual";
import { weatherBusinessMultiplier } from "../world/worldContinuity";
import { saveMissionProgress, restoreMissionProgress } from "../world/GameSystems";
import { loadJSON, saveJSON } from "../storage";
import { SAVE_KEYS } from "../registries";
import { EARTH_LOCAL_KEY, parseEarthLocal, sharesStylizedFrame, type EarthLocalSave } from "./earthLocal";
import { SLOT_KEY, parseSlots, withActive } from "./slots";
import type { Slice } from "../slice";
import type { Weather as EarthWeather } from "./Ambient";
import type { Weather as SimWeather } from "../store";

function missionLocal(anchor: LatLon, target: [number, number, number]) {
  return latLonToLocal(anchor, sliceToLatLon(target[0], -target[2]));
}

// Earth weather → sim weather. The sim has no "cloudy" (its overcast state
// is fog, a visibility state, not a cloud state), so cloudy maps to clear —
// the sim clock still advances and the earth sky still shows clouds.
export function earthWeatherToSim(w: EarthWeather): SimWeather {
  return w === "rain" ? "rain" : "clear";
}

export function EarthSimBridge({ slice, weather }: { slice: Slice | null; weather: EarthWeather }) {
  const bound = useRef<string | null>(null);
  const loopBound = useRef(false);
  const bedAcc = useRef(0);

  useEffect(() => {
    if (!slice) return;
    if (bound.current === slice.name) return;
    bound.current = slice.name;
    sim.bindSlice(slice);
  }, [slice]);

  useEffect(() => {
    if (loopBound.current) return;
    loopBound.current = true;
    sim.loop.start();
    return () => {
      sim.loop.stop();
      loopBound.current = false;
    };
  }, []);

  // §2.8.4 — autosave: every 20 s wall-clock (mirrors the stylized
  // autosave) + on pagehide, so a quick exit still resumes.
  useEffect(() => {
    const id = window.setInterval(() => saveEarth(), 20000);
    const onHide = () => saveEarth();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  useFrame((_, dt) => {
    if (playState.paused) {
      playState.night = 1 - sunDayFactor(sim.clock.hour);
      return;
    }
    sim.loop.tick(dt);
    sim.beginFrame();
    sim.clock.syncFromShared(shared.day, shared.hour, earthWeatherToSim(weather));
    sim.clock.advance(dt);
    shared.hour = sim.clock.hour;
    shared.day = sim.clock.day;
    playState.night = 1 - sunDayFactor(sim.clock.hour);

    const crimes = playState.infractions;
    if (crimes > 0) {
      playState.infractions = 0;
      useStats.getState().heat(crimes, 0);
    }
    useStats.getState().decay(dt);

    // The NB road graph is only true at the slice origin. Everywhere else
    // (and after a rebase) guidance is the straight line to the local target.
    const p = playState.player;
    const arc = currentArc();
    const job = currentJob();
    let guide: { distanceRemaining: number; bearing: number; wrongWay: boolean } | null = null;
    if (arc) {
      const target = latLonToLocal(playState.anchor, arc);
      guide = straightGuide(p.pos.x, p.pos.z, p.heading, target.x, target.z);
    } else if (job) {
      const point = chasePoint(job.step, jobClock());
      const target = latLonToLocal(playState.anchor, point);
      guide = straightGuide(p.pos.x, p.pos.z, p.heading, target.x, target.z);
    } else {
      const ms = useMission.getState();
      const step = ms.done ? null : ms.steps[ms.step];
      if (step?.target) {
        const target = missionLocal(playState.anchor, step.target);
        guide = straightGuide(p.pos.x, p.pos.z, p.heading, target.x, target.z);
      }
    }
    playState.career.seconds += dt;
    playState.career.meters += Math.max(0, p.speed) * dt;
    if (useStats.getState().police > 0.4) playState.heatSeen = true;
    bedAcc.current += dt;
    if (bedAcc.current > 1) {
      bedAcc.current = 0;
      const geo = localToLatLon(playState.anchor, p.pos.x, p.pos.z);
      const city = nearestCity(geo.lat, geo.lon);
      sfx.setBed(bedFor(city.region, p.speed, city.kind === "highway"));
    }
    shared.navDist = guide?.distanceRemaining ?? 0;
    shared.navBearing = guide?.bearing ?? 0;
    shared.navWrongWay = guide?.wrongWay ?? false;
    shared.navPath = null;

    // §2.8.3 — front income ticks in earth too (same rate as the stylized
    // build: incomePerSec over a 600 s game day, weather-adjusted). A front
    // bought in either build earns in both.
    const income = useEconomy.getState().incomePerSec(600);
    if (income > 0) {
      useStats.getState().addCash(income * dt * weatherBusinessMultiplier(earthWeatherToSim(weather)));
    }
  });

  return null;
}

// §2.8.1 — mission completion in earth. Same rule as the stylized
// MissionRunner (stepComplete); the only earth-specific parts are the pose
// source (playState, not a Rapier body) and the heat input (earth has no
// police yet — §2.8.2 — so police is 0 and noHeat steps complete).
export function EarthMissionRunner() {
  const camera = useThree((s) => s.camera);
  const root = useRef<THREE.Group>(null);
  const arcArm = useRef(0);
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (playState.paused) return;
    const p = playState.player;
    const arc = currentArc();
    let marker: { x: number; z: number } | null = null;
    const job = !arc ? currentJob() : null;
    if (arc) {
      marker = latLonToLocal(playState.anchor, arc);
      arcArm.current = playState.settled ? arcArm.current + Math.min(dt, 0.05) : 0;
      if (arcArm.current > 2 && arcDistance(playState.anchor, p.pos.x, p.pos.z, arc) <= arc.radius && (!arc.needCar || p.driving)) {
        const done = advanceArc();
        if (done?.reward) {
          useStats.getState().addCash(done.reward);
          sfx.cash();
          useToasts.getState().push(`+$${done.reward}`, "#7CFC00");
        }
        const next = currentArc();
        useToasts.getState().push(next ? next.text : "The Narrows lets you go. The campaign is open.", "#ffcf4a");
        saveEarth();
      }
    } else if (job) {
      const point = chasePoint(job.step, jobClock());
      marker = latLonToLocal(playState.anchor, point);
      const heat = useStats.getState().police;
      if (tickJob(Math.min(dt, 0.05), heat) === "fail") {
        useToasts.getState().push("Failed. Back to the last checkpoint.", "#ff8a8a");
        saveEarth();
      }
      const reached = Math.hypot(p.pos.x - marker.x, p.pos.z - marker.z) <= job.step.radius;
      if (playState.settled && reached && (!job.step.needCar || p.driving) && (!job.step.noHeat || heat < 0.8)) {
        const moved = advanceJob();
        if (moved?.reward) {
          useStats.getState().addCash(moved.reward);
          sfx.cash();
          useToasts.getState().push(`+$${moved.reward}`, "#7CFC00");
        }
        useToasts.getState().push(moved?.finished ? `${job.job.title} complete.` : (moved?.text ?? ""), "#ffcf4a");
        saveEarth();
      }
    }
    const ms = useMission.getState();
    const cur = ms.done ? null : ms.steps[ms.step];
    if (!arc && !job && cur?.target) marker = missionLocal(playState.anchor, cur.target);
    if (root.current) {
      root.current.visible = !!marker;
      if (marker) root.current.position.set(marker.x, 0, marker.z);
    }
    if (marker) {
      const fade = markerFade(Math.hypot(camera.position.x - marker.x, camera.position.z - marker.z));
      if (ring.current) {
        ring.current.visible = fade > 0.01;
        (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.42 * fade;
      }
      if (beam.current) {
        beam.current.visible = fade > 0.01;
        (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.085 * fade;
      }
    }
    // The opening arc owns the objective until it's finished. The shared
    // campaign then uses the same completion rule, in the live local frame.
    if (arc || job || !cur || ms.done) return;
    const local = cur.target ? missionLocal(playState.anchor, cur.target) : null;
    const complete = stepComplete(
      local ? { ...cur, target: [local.x, 0, local.z] } : cur,
      { pos: { x: p.pos.x, z: p.pos.z }, driving: p.driving, police: useStats.getState().police },
    );
    if (!complete) return;
    if (cur.reward) {
      useStats.getState().addCash(cur.reward);
      sfx.cash();
      useToasts.getState().push(`+$${cur.reward}`, "#7CFC00");
    } else sfx.ui();
    const oneStep = ms.steps.length === 1;
    const finishedTitle = ms.title;
    ms.advance();
    const ns = useMission.getState();
    useToasts.getState().push(ns.done ? "Mission complete" : ns.objective, "#ffcf4a");
    if (oneStep && !ns.done) useToasts.getState().push(`MISSION COMPLETE — ${finishedTitle.toUpperCase()}`, "#ffcf4a");
  });

  return (
    <group ref={root}>
      <mesh ref={beam} position={[0, 9, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 18, 12, 1, true]} />
        <meshBasicMaterial color="#ffcf4a" transparent opacity={0.085} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.2, 0]}>
        <ringGeometry args={[2.0, 2.25, 28]} />
        <meshBasicMaterial color="#ffcf4a" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <LicensedHuman slot={1} moving={() => false} fallback={<Character shirt="#c4552a" pants="#2c2f3a" moving={() => false} />} />
    </group>
  );
}

// §2.8.4 — persistence. Same keys + shapes as the stylized build:
// - mission: SAVE_KEYS.mission via saveMissionProgress/restoreMissionProgress
// - position: SAVE_KEYS.pos ("mounthope.pos.v1") as {mode, px, py, pz,
//   heading, day, hour, savedAtMs} — the same PosRec shape GameSystems
//   writes, so canContinue() and the stylized restore understand it.
// - stats: useStats.save() (cash/health/police/faction)
// - economy: useEconomy.save() (owned fronts)
export function saveEarth(): void {
  try {
    saveMissionProgress();
    const p = playState.player;
    // A Cape or Brockton pose is in that place's local frame. Writing it into
    // the shared New Bedford save would resume the stylized build in the wrong
    // city. The earth-local blob remembers the anchor instead.
    if (playState.settled) {
      const local: EarthLocalSave = {
        placeId: playState.placeId,
        x: p.pos.x,
        z: p.pos.z,
        heading: p.heading,
        lat: playState.anchor.lat,
        lon: playState.anchor.lon,
        arcStep: arcIndex(),
        ...jobSnapshot(),
        careerSeconds: playState.career.seconds,
        careerMeters: playState.career.meters,
        careerDrove: playState.career.drove,
        careerRepairs: playState.career.repairs,
        heatSeen: playState.heatSeen,
      };
      if (parseEarthLocal(local)) {
        saveJSON(EARTH_LOCAL_KEY, local);
        const stored = parseSlots(loadJSON(SLOT_KEY, null));
        saveJSON(SLOT_KEY, withActive(stored, stored.active, local));
      }
      if (sharesStylizedFrame(playState.placeId) && anchorIsSliceOrigin(playState.anchor)) {
        saveJSON(SAVE_KEYS.pos, {
          mode: p.driving ? "car" : "foot",
          px: p.pos.x,
          py: p.pos.y,
          pz: p.pos.z,
          heading: p.heading,
          day: shared.day,
          hour: shared.hour,
          savedAtMs: Date.now(),
        });
      }
    }
    useStats.getState().save();
    useEconomy.getState().save();
  } catch {
    // A failed autosave must never crash the game loop.
  }
}

export function loadEarthLocal(): EarthLocalSave | null {
  return parseEarthLocal(loadJSON<unknown>(EARTH_LOCAL_KEY, null));
}

/** Saved earth/stylized position, or null when there is no save. */
export function loadEarthPos(): { x: number; z: number; heading: number } | null {
  const rec = loadJSON<{ px?: number; pz?: number; heading?: number } | null>(SAVE_KEYS.pos, null);
  if (!rec || typeof rec.px !== "number" || typeof rec.pz !== "number") return null;
  return { x: rec.px, z: rec.pz, heading: typeof rec.heading === "number" ? rec.heading : 0 };
}

/** Restore the mission progress + stats into the shared stores (call on boot). */
export function restoreEarth(): void {
  restoreMissionProgress();
  useStats.getState().load();
  const local = loadEarthLocal();
  if (local?.arcStep != null) loadArc(local.arcStep);
  else {
    const ms = useMission.getState();
    if (ms.done || ms.mi > 0 || ms.step > 0) finishArc();
  }
  loadJobs(local);
  if (local) {
    playState.career.seconds = local.careerSeconds ?? 0;
    playState.career.meters = local.careerMeters ?? 0;
    playState.career.drove = local.careerDrove === true;
    playState.career.repairs = local.careerRepairs ?? 0;
    playState.heatSeen = local.heatSeen === true;
  }
}
