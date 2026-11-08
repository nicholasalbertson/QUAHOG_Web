import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../store";
import { useMission } from "../mission";
import { shared } from "../shared";
import { sim } from "./SimRuntime";
import { soakUrlEnabled, startSoak, tickSoak } from "./SoakHarness";
import { spatialAudio } from "../audio/SpatialAudio";
import { publishDebugOverlay } from "./DebugOverlay";
import { flag } from "../flags";
import { useEconomy } from "../economy";
import { useStats } from "../game";
import { GAME_DAY_SECONDS, weatherBusinessMultiplier } from "../world/worldContinuity";
import { moveAxis, isDown } from "../input";
import { replayRecorder } from "./ReplayRecorder";
import { setTelemetrySink } from "../telemetry/schema";
import { duckForWanted } from "./CutsceneStub";
import { playThunderNear } from "./LightningAudio";
import { IdleDetect } from "./IdleDetect";
import { webGlContextLoss } from "./WebGlContextLoss";
import { clampAccumulator } from "./ResumeFastPath";
import { readMemory } from "./PerfMemory";

/**
 * Boots the clean-room simulation layer once the slice is ready and keeps
 * navigation / streamer / budget in sync with player pose each frame.
 * §1.1: drives GameLoop so fixed-step migrations can subscribe over time.
 */
export function SimBootstrap() {
  const slice = useGame((s) => s.slice);
  const quality = useGame((s) => s.quality);
  const paused = useGame((s) => s.paused);
  const bound = useRef<string | null>(null);
  const loopBound = useRef(false);
  const stepUnsub = useRef<null | (() => void)>(null);
  const slowSteps = useRef(0);
  const idle = useRef(new IdleDetect({ throttleAfterSec: 60, pauseAfterSec: 300 }));

  useEffect(() => {
    sim.configureQuality(quality);
  }, [quality]);

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

    // §1.1.11 / §1.1.19–21 — fixed-step: RNG advance, mission timers, economy, heat soften.
    stepUnsub.current = sim.loop.on("step", (dt) => {
      if (flag("deterministicSim")) sim.rng.stream("default").advance(1);

      // Weather transition on fixed step (§1.1.22).
      const prevFlash = sim.clock.lightningFlash;
      sim.clock.advance(dt);
      sim.signals.stepAll(dt);

      // Mission timers + triggers on fixed step (§1.1.20 / §1.3.12).
      if (flag("missionTimers")) {
        const body = useGame.getState().mode === "car" ? shared.car
          : useGame.getState().mode === "boat" ? shared.boat : shared.player;
        const p = body?.translation();
        const st = useStats.getState();
        sim.missions.advance(dt, [], p ? {
          x: p.x,
          z: p.z,
          hp: st.health,
          inventory: { pistol: 1 },
        } : undefined);
      }

      // Economy passive income on fixed step (§1.1.21).
      const income = useEconomy.getState().incomePerSec(GAME_DAY_SECONDS);
      if (income > 0) {
        const w = weatherBusinessMultiplier(useGame.getState().weather);
        useStats.getState().addCash(income * dt * w);
      }

      // Soft heat decay when not in combat alarm (§1.1.19) — lose-heat zones accelerate.
      if (shared.alarm.t <= 0) {
        const st = useStats.getState();
        const body = useGame.getState().mode === "car" ? shared.car
          : useGame.getState().mode === "boat" ? shared.boat : shared.player;
        const p = body?.translation();
        const mul = p ? sim.loseHeat.mulAt(p.x, p.z) : 1;
        if (st.police > 0 || st.faction > 0) st.heat(-dt * 0.02 * mul, -dt * 0.015 * mul);
        sim.heat.decay(dt * mul, true, mul > 1);
      }

      // §1.4.10 Thunder when lightning just flashed.
      if (prevFlash <= 0 && sim.clock.lightningFlash > 0) {
        const body = useGame.getState().mode === "car" ? shared.car
          : useGame.getState().mode === "boat" ? shared.boat : shared.player;
        const p = body?.translation();
        if (p) playThunderNear(p.x + 40, p.z - 20, 0.5);
      }

      // §1.3.36 / §9.4 Duck for wanted stars.
      spatialAudio.setDuck(duckForWanted(useStats.getState().police));


      // Replay record hook (§1.1.12).
      if (replayRecorder.isRecording) {
        const ax = moveAxis();
        replayRecorder.recordStep({
          steer: ax.x,
          throttle: ax.y,
          bits: (isDown("Space") ? 1 : 0) | (isDown("ShiftLeft") || isDown("ShiftRight") ? 2 : 0),
        });
      }
    });

    return () => {
      stepUnsub.current?.();
      stepUnsub.current = null;
      sim.loop.stop();
      loopBound.current = false;
    };
  }, []);

  useEffect(() => {
    if (paused) sim.loop.pause("menu");
    else sim.loop.resume("menu");
  }, [paused]);

  useEffect(() => {
    if (soakUrlEnabled()) startSoak();
  }, []);

  // §0.4 Console telemetry sink when flag.telemetry is on.
  useEffect(() => {
    if (!flag("telemetry")) {
      setTelemetrySink(() => undefined);
      return;
    }
    setTelemetrySink((name, payload) => {
      // eslint-disable-next-line no-console
      console.debug(`[telemetry] ${name}`, payload ?? "");
    });
    return () => setTelemetrySink(() => undefined);
  }, []);

  // §1.1.10 / §12.5 / §2.2.1: tab hide pauses the fixed-step loop.
  // §2.2.3 Resume fast-path — clamp accumulator to a single step (no catch-up storm).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) sim.loop.pause("tab");
      else {
        const stats = sim.loop.stats as { accumulator?: number };
        if (typeof stats.accumulator === "number") {
          (sim.loop as unknown as { setAccumulator?: (n: number) => void }).setAccumulator?.(
            clampAccumulator(stats.accumulator),
          );
        }
        sim.loop.resume("tab");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // §2.1.6 Attach WebGL context-loss handler when a canvas appears.
  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (canvas instanceof HTMLCanvasElement) webGlContextLoss.attach(canvas);
    return () => webGlContextLoss.detach();
  }, []);

  useFrame((_, dt) => {
    const game = useGame.getState();
    if (!game.started) return;

    // §2.2.2 Idle poke from any stick/key activity.
    const axis = moveAxis();
    if (axis.x || axis.y || isDown("KeyE") || isDown("ShiftLeft") || isDown("Space")) idle.current.poke();
    const idleAct = idle.current.action();
    if (idleAct === "pause" && !document.hidden) sim.loop.pause("idle");
    else if (idleAct !== "pause") sim.loop.resume("idle");

    // Drive fixed-step accumulator even when paused (input/render still run).
    // Throttle suggested fps when idle (caller/render may honor via quality).
    const stepDt = idleAct === "throttle" ? Math.min(dt, 1 / 15) : dt;
    sim.loop.tick(stepDt);

    // §1.1.13 Watchdog: 3 consecutive slow step frames → drop quality tier.
    if (sim.loop.stats.stepMs > 50) {
      slowSteps.current++;
      if (slowSteps.current >= 3 && game.quality > 0) {
        game.setQuality((game.quality - 1) as 0 | 1 | 2);
        slowSteps.current = 0;
      }
    } else {
      slowSteps.current = 0;
    }

    if (game.paused) return;
    sim.beginFrame();

    // Keep ClockWeather aligned with the live store (incl. snow / blizzard).
    // Advance runs on fixed step (§1.1.22); sync only here.
    sim.clock.syncFromShared(shared.day, shared.hour, game.weather);

    const mode = game.mode;
    const body = mode === "car" ? shared.car : mode === "boat" ? shared.boat : shared.player;
    const t = body?.translation();
    if (!t) return;

    const heading = mode === "car" ? shared.carYaw : mode === "boat" ? shared.boatYaw : shared.heading;
    const speed = mode === "car" ? shared.carSpeed : 0;

    // §9.2 Spatial audio listener tracks actor pose.
    spatialAudio.setListener(t.x, t.y + 1.6, t.z, Math.sin(heading), Math.cos(heading));

    // Mission target wins; else player waypoint.
    const ms = useMission.getState();
    const step = ms.done ? null : ms.steps[ms.step];
    const wp = game.waypoint;
    if (step?.target) {
      sim.setNavGoal({ x: step.target[0], z: step.target[2] });
    } else if (wp) {
      sim.setNavGoal({ x: wp.x, z: wp.z });
    } else {
      sim.setNavGoal(null);
    }

    const guidance = sim.tickNav(dt, { x: t.x, z: t.z }, heading, speed);
    shared.navDist = guidance.distanceRemaining;
    shared.navBearing = guidance.bearing;
    shared.navWrongWay = guidance.wrongWay;
    shared.navPath = guidance.path?.points ?? null;

    // §1.1.24 / §0.2 — publish debug overlay when telemetry flag is on.
    if (flag("telemetry")) {
      const ps = sim.pedGraph?.stats();
      const ov = sim.budget.overruns
        .slice(0, 3)
        .map((c) => `${c.system}:${c.ms.toFixed(1)}`)
        .join(",");
      const mem = readMemory();
      publishDebugOverlay({
        loop: { ...sim.loop.stats },
        pedNodes: ps?.nodes ?? 0,
        pedEdges: ps?.edges ?? 0,
        pedOrphans: ps?.orphansHint ?? 0,
        roadNodes: sim.graph?.nodes.length ?? 0,
        replay: replayRecorder.digest(),
        stepDigest: sim.rng.digest(),
        missionOwned: sim.missions.ownedCount,
        occupancyHot: Math.round(sim.clock.lightningFlash * 10),
        budgetOverruns: ov || (mem.supported ? `heap:${Math.round((mem.usedJSHeapSize ?? 0) / 1e6)}M` : ""),
        glContext: webGlContextLoss.snapshot().phase,
      });
    }

    tickSoak();
  });

  return null;
}
