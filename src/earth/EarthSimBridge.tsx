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
import { markerFade } from "../world/markerVisual";
import { weatherBusinessMultiplier } from "../world/worldContinuity";
import { saveMissionProgress, restoreMissionProgress } from "../world/GameSystems";
import { loadJSON, saveJSON } from "../storage";
import { SAVE_KEYS } from "../registries";
import type { Slice } from "../slice";
import type { Weather as EarthWeather } from "./Ambient";
import type { Weather as SimWeather } from "../store";

// Earth weather → sim weather. The sim has no "cloudy" (its overcast state
// is fog, a visibility state, not a cloud state), so cloudy maps to clear —
// the sim clock still advances and the earth sky still shows clouds.
export function earthWeatherToSim(w: EarthWeather): SimWeather {
  return w === "rain" ? "rain" : "clear";
}

export function EarthSimBridge({ slice, weather }: { slice: Slice | null; weather: EarthWeather }) {
  const bound = useRef<string | null>(null);
  const loopBound = useRef(false);

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
    sim.loop.tick(dt);
    sim.beginFrame();
    sim.clock.syncFromShared(shared.day, shared.hour, earthWeatherToSim(weather));
    sim.clock.advance(dt);

    // Mission target wins; else no nav goal (earth has no free waypoint yet).
    const ms = useMission.getState();
    const step = ms.done ? null : ms.steps[ms.step];
    if (step?.target) sim.setNavGoal({ x: step.target[0], z: step.target[2] });
    else sim.setNavGoal(null);

    const p = playState.player;
    const guidance = sim.tickNav(dt, { x: p.pos.x, z: p.pos.z }, p.heading, p.speed);
    shared.navDist = guidance.distanceRemaining;
    shared.navBearing = guidance.bearing;
    shared.navWrongWay = guidance.wrongWay;
    shared.navPath = guidance.path?.points ?? null;

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
  const step = useMission((s) => (s.done ? null : s.steps[s.step]));
  const camera = useThree((s) => s.camera);
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const pos = useMission.getState().steps[useMission.getState().step]?.target;
    if (pos) {
      const fade = markerFade(Math.hypot(camera.position.x - pos[0], camera.position.z - pos[2]));
      if (ring.current) {
        ring.current.visible = fade > 0.01;
        (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.42 * fade;
      }
      if (beam.current) {
        beam.current.visible = fade > 0.01;
        (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.085 * fade;
      }
    }
    const ms = useMission.getState();
    if (ms.done) return;
    const cur = ms.steps[ms.step];
    if (!cur) return;
    const p = playState.player;
    const complete = stepComplete(cur, {
      pos: { x: p.pos.x, z: p.pos.z },
      driving: p.driving,
      // §2.8.2 — no police system in earth yet, so heat is always 0.
      police: useStats.getState().police,
    });
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

  if (!step?.target) return null;
  const [x, , z] = step.target;
  return (
    <group position={[x, 0, z]}>
      <mesh ref={beam} position={[0, 9, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 18, 12, 1, true]} />
        <meshBasicMaterial color="#ffcf4a" transparent opacity={0.085} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.2, 0]}>
        <ringGeometry args={[2.0, 2.25, 28]} />
        <meshBasicMaterial color="#ffcf4a" transparent opacity={0.42} depthWrite={false} />
      </mesh>
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
    useStats.getState().save();
    useEconomy.getState().save();
  } catch {
    // A failed autosave must never crash the game loop.
  }
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
}
