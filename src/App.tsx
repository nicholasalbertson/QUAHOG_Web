import "./textSetup";
import { Component, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { FrameDriver } from "./mobile/FrameDriver";
import { mobileBudget } from "./mobile/profile";
import { Experience } from "./Experience";

// Keep one failing 3D component (e.g. a CDN asset that won't load) from blanking
// the entire game — render an empty scene instead of an unhandled throw. The HUD
// and menus (outside the Canvas) keep working.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error("[scene] component error:", e); }
  render() { return this.state.failed ? null : this.props.children; }
}

// WebGL context guard (2026-11-07, streamer-stability diagnosis). Nic's 52 s
// playtest video shows the whole 3D world unloading mid-drive (white void,
// HUD + minimap still live) and coming back — the prime suspect is a WebGL
// context loss under memory/GPU pressure, and the main game had NO listener
// for it at all (only the photoreal earth page did), so a loss was silent:
// no log, no beacon, no recovery handling. A lost context leaves the canvas
// transparent (white over the white page); three re-initialises on restore,
// which fits the pale/washed-out frame after the reload (textures re-uploading).
// The listener MUST preventDefault() the loss event — without it the context
// can never be restored and the canvas stays dead. console.error (not warn)
// so the debug overlay's ring buffer captures it and the 1 Hz beacon ships it.
function ContextGuard() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const c = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault(); // required — without it the context cannot be restored
      console.error("[context] WebGL context lost — world unloaded (GPU/memory pressure suspected); attempting restore");
      try {
        useToasts.getState().push("GRAPHICS RESTARTED — the world is reloading", "#ffb0b0");
      } catch { /* telemetry must never break the game */ }
    };
    const onRestored = () => {
      console.error("[context] WebGL context restored — world back");
      try {
        useToasts.getState().push("Graphics back — world restored", "#7CFC00");
      } catch { /* telemetry must never break the game */ }
    };
    c.addEventListener("webglcontextlost", onLost);
    c.addEventListener("webglcontextrestored", onRestored);
    return () => {
      c.removeEventListener("webglcontextlost", onLost);
      c.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [gl]);
  return null;
}
import { HUD } from "./HUD";
import { Minimap } from "./Minimap";
import { PauseMenu } from "./ui/PauseMenu";
import { CharacterMenu } from "./ui/CharacterMenu";
import { BigMap } from "./ui/BigMap";
import { TouchControls } from "./ui/TouchControls";
import { Toasts } from "./ui/Toasts";
import { DebugStats } from "./ui/DebugStats";
import { DebugOverlay } from "./debug/DebugOverlay";
import { DebugCapture } from "./debug/DebugCapture";
import { PerfProbe } from "./ui/PerfProbe";
import { AssetLoadNotice } from "./assets/AssetLoadNotice";
import { StartMenu } from "./ui/StartMenu";
import { peekBoot, clearBoot } from "./boot/intent";
import { clearAllSaves } from "./sim/SaveGame";
import { useStats } from "./game";
import { useMission } from "./mission";
import { useEconomy } from "./economy";
import { useInventory } from "./inventory";
import { worldJournal } from "./world/worldJournal";
import { sfx } from "./audio/sfx";
import { Radio } from "./audio/Radio";
import { installInput } from "./input";
import { useGame, useToasts } from "./store";
import { requestGuardedSpawn } from "./world/SpawnGuard";
import { applyReviewStore } from "./dev/visualReview";

// Build 002: quality presets now actually change GPU workload (study technique).
// Low locks DPR to 1; Medium allows up to 1.25; High up to 1.5.
const DPR_BY_QUALITY: ([number, number] | number)[] = [1, [1, 1.25], [1, 1.5]];

export default function App() {
  const [sliceName, setSliceName] = useState("loading…");
  const [progress, setProgress] = useState(0);
  const quality = useGame((s) => s.quality);
  const started = useGame((s) => s.started);
  const booting = useState(() => (peekBoot() ?? "").startsWith("street"))[0];

  useEffect(() => {
    const intent = peekBoot();
    if (intent !== "street-new" && intent !== "street-continue") return;
    clearBoot();
    if (intent === "street-new") {
      clearAllSaves();
      useStats.getState().reset();
      useMission.getState().reset();
      useEconomy.setState({ owned: {} });
      useInventory.getState().reset();
      worldJournal.reset();
      useGame.getState().resetSession();
    }
    sfx.setVolume(0.5);
    useGame.getState().setStarted(true);
  }, []);

  // stable callbacks so the Experience loader effect doesn't re-run each render
  // Fall River integration (2026-11-03): onReady also fires the deferred
  // cross-district teleport. Corridor phase 1 (2026-11-07): Experience no
  // longer remounts on a district switch — the Physics world + player/car
  // bodies persist and the render swaps to the new slice when it arrives.
  // The teleport still waits for the new slice to load (onReady fires from
  // Experience's activate step) — teleporting earlier would put the player
  // over a district whose roads/tiles haven't loaded yet. Same shape as
  // BigMap.travel.
  // Spawn guard (2026-11-07): the teleport is handed to the guard, which
  // parks the bodies DISABLED at the target and only releases them (mode
  // foot) once the ground tile under the spawn is confirmed mounted — the
  // slice having loaded is not proof the 3D world rendered (Brockton void:
  // minimap had the roads, the world never rendered). On timeout the guard
  // falls back to somewhere solid instead of spawning over void.
  const onReady = useCallback((s: { name: string }) => {
    setSliceName(s.name);
    const pending = useGame.getState().pendingFastTravel;
    if (pending) {
      useGame.getState().setPendingFastTravel(null);
      requestGuardedSpawn({ x: pending.x, z: pending.z });
    }
  }, []);
  const onProgress = useCallback((f: number) => setProgress(f), []);

  useEffect(() => {
    installInput();
    applyReviewStore((partial) => useGame.setState(partial as Parameters<typeof useGame.setState>[0]));
  }, []);

  return (
    <>
      {started && (
      <Canvas
        shadows="soft"
        frameloop="never"
        camera={{ fov: 60, near: 0.3, far: 1000, position: [0, 10, 24] }}
        dpr={mobileBudget(quality).dpr}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.98 }}
      >
        <FrameDriver />
        <DebugCapture />
        <PerfProbe />
        <ContextGuard />
        <Suspense fallback={null}>
          <SceneBoundary>
            {/* Corridor phase 1 (2026-11-07): no key={district} — a district
                switch no longer remounts the scene. Experience keeps the
                old district rendering until the new slice arrives, then
                swaps and fires onReady (which teleports the player). */}
            <Experience onReady={onReady} onProgress={onProgress} />
          </SceneBoundary>
        </Suspense>
      </Canvas>
      )}
      {started && (
        <>
      <HUD sliceName={sliceName} />
      <Minimap />
      <BigMap />
      <CharacterMenu />
      <PauseMenu />
      <TouchControls />
      <Toasts />
      <Radio />
      <DebugStats />
      <DebugOverlay />
      <AssetLoadNotice />
        </>
      )}
      {(booting || started) && sliceName === "loading…" && (
        <div id="world-loading" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(9,24,31,.72)", color: "#e9e8df", fontFamily: "system-ui, sans-serif", zIndex: 20, pointerEvents: "none" }}>
          Loading the coast… {Math.round(progress * 100)}%
        </div>
      )}
      {!(booting && !started && sliceName === "loading…") && <StartMenu sliceName={sliceName} progress={progress} canPlay />}
    </>
  );
}
