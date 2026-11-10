import "../textSetup";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import {
  TilesRenderer,
  GlobeControls,
  TilesAttributionOverlay,
  EastNorthUpFrame,
} from "3d-tiles-renderer/r3f";
import { WGS84_ELLIPSOID } from "3d-tiles-renderer/three";
import { type Slice } from "../slice";
import { consumeTap, installInput } from "../input";
import { computeSpawn } from "./follow";
import { useContext } from "react";
import { TilesRendererContext } from "3d-tiles-renderer/r3f";
import { CityLife, PlayerRig, type Spawn, type View } from "./PlayWorld";
import { EarthSimBridge, EarthMissionRunner, loadEarthLocal, loadEarthPos, restoreEarth, saveEarth } from "./EarthSimBridge";
import { playState } from "./playState";
import { useMission } from "../mission";
import { useStats } from "../game";
import { shared } from "../shared";
import { headingToCompass } from "../world/compass";
import { Ambient, type Weather } from "./Ambient";
import { EnvLight } from "../world/EnvLight";
import { sunPositionForHour, sunDayFactor } from "./dayNight";
import { shouldShowFallbackGround, FALLBACK_GROUND_SIZE, earthFallbackNotice } from "./fallbacks";
import {
  DEV_TILES_KEY,
  fetchTilesKey,
  normalizeTilesKey,
  pickTilesKey,
  takeDevOverride,
  type TilesKeySource,
} from "./tilesKey";
import { sim } from "../sim/SimRuntime";
import { TilesBVH } from "./bvh";
import { GoogleTilesAuth } from "./GoogleTilesAuth";
import { useTileActivity } from "./useTileActivity";
import { faultCopy, mergeFault, type TileFault } from "./tileFault";
import { Radio } from "../audio/Radio";
import { EarthBigMap, EarthMinimap, liveRoadsAligned, useLiveCityRoads } from "./EarthMap";
import { speedMph } from "./drive";
import { describeLocation } from "./regionMap";
import { DEFAULT_PLACE_ID, REGIONS, anchorOf, placeById, placesInRegion, roadsSliceFor } from "./regions";
import { loadSliceCached } from "./sliceCache";
import { DEG_TO_RAD } from "./enuFrame";
import { nearestRoadSpawn } from "./rebase";
import { SLICE_ORIGIN, localToLatLon, type LatLon } from "./geo";
import { useGame } from "../store";
import { TouchControls } from "../ui/TouchControls";
import { CoastExtras } from "../ui/CoastExtras";
import { currentArc, resetArc } from "./arc";
import { actionCode, loadSettings, saveSettings, type EarthSettings, type QualityChoice } from "./controls";
import { QUALITY_PRESET, capsForTier, meanOf, memoryBand, nextQuality, type QualityName } from "./quality";
import { applyTileMemoryCaps, type TileMemoryHost } from "./tileCaps";
import { formatCrash } from "./crashReport";
import { advanceLine, currentJob, currentLine } from "./jobs";
import { CONTROLS_TEXT, nextHint, tutorialStep } from "./tutorial";
import { DriveHint, PauseScreen, TitleScreen } from "./EarthMenu";
import { peekBoot, clearBoot } from "../boot/intent";
import { sfx } from "../audio/sfx";

// Mount Hope on Google Photorealistic 3D Tiles. Browser fetches tiles from
// tile.googleapis.com. The key comes from the site (Vercel /api/tiles-key,
// a build-time VITE_ var, or tiles-key.json). ?key= is a dev override for
// this tab only. See ENV.md. Players never need a key in the URL.

function bootPlaceId(): string {
  if (typeof window === "undefined") return DEFAULT_PLACE_ID;
  const local = loadEarthLocal();
  return local && placeById(local.placeId) ? local.placeId : DEFAULT_PLACE_ID;
}

function bootAnchor(): LatLon {
  if (typeof window === "undefined") return { ...SLICE_ORIGIN };
  const local = loadEarthLocal();
  if (local?.lat != null && local.lon != null) return { lat: local.lat, lon: local.lon };
  const place = placeById(bootPlaceId());
  return place ? anchorOf(place) : { ...SLICE_ORIGIN };
}

const KEY_STORE = "mh.googleMapsKey";

function viteTilesKey(): string | null {
  const env = import.meta.env;
  return normalizeTilesKey(env.VITE_GOOGLE_MAP_TILES_KEY) || normalizeTilesKey(env.VITE_GOOGLE_MAPS_API_KEY);
}

function readBrowserTilesKey(): { key: string; source: TilesKeySource } | null {
  return pickTilesKey({ dev: takeDevOverride(), build: viteTilesKey() });
}

const WX: Record<Weather, { sun: number; sunColor: string; bg: string; fog: [number, number]; sky: boolean }> = {
  clear: { sun: 2.2, sunColor: "#fff6e8", bg: "#bcd4ea", fog: [600, 3200], sky: true },
  cloudy: { sun: 1.4, sunColor: "#eef0f4", bg: "#c4ccd6", fog: [380, 2000], sky: true },
  rain: { sun: 1.0, sunColor: "#cfd6dd", bg: "#9aa4ae", fog: [200, 1100], sky: false },
};

export function EarthApp() {
  const atlas = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("atlas") === "1";
  const [keyBoot] = useState(() => (typeof window === "undefined" ? null : readBrowserTilesKey()));
  const [apiKey, setApiKey] = useState<string | null>(keyBoot?.key ?? null);
  const [keySource, setKeySource] = useState<TilesKeySource | null>(keyBoot?.source ?? null);
  const [keyPending, setKeyPending] = useState(() => typeof window !== "undefined" && !keyBoot && !atlas);
  const [slice, setSlice] = useState<Slice | null>(null);
  const [mode, setMode] = useState<"play" | "orbit">("orbit");
  const [view, setView] = useState<View>("third");
  const [placeId, setPlaceId] = useState(bootPlaceId);
  const [anchor, setAnchor] = useState<LatLon>(bootAnchor);
  const [screen, setScreen] = useState<"title" | "play">("title");
  const [worldOn, setWorldOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [useResume, setUseResume] = useState(true);
  const [snap, setSnap] = useState<Spawn | null>(null);
  const [snapWait, setSnapWait] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [weather, setWeather] = useState<Weather>("clear");
  const [ready, setReady] = useState(false);
  const [tilesProblem, setTilesProblem] = useState(false);
  // §2.3: classified tile fault (401/429/5xx) with distinct copy + retry.
  const [fault, setFault] = useState<TileFault | null>(null);
  // Bumping this re-mounts the tiles renderer (retry without a page reload).
  const [tilesKey, setTilesKey] = useState(0);
  // §2.2: pause the frame loop when the tab is hidden or the player is idle.
  const activity = useTileActivity(mode === "play" && !paused);
  // §2.1.6: WebGL context loss pauses the loop and shows a HUD notice.
  const [glLost, setGlLost] = useState(false);
  const [lostAt, setLostAt] = useState<number | null>(null);
  const [settings, setSettings] = useState<EarthSettings>(loadSettings);
  const [tier, setTier] = useState<QualityName>(() => {
    const choice = loadSettings().quality;
    return choice === "auto" ? "high" : choice;
  });
  const [crashText, setCrashText] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [seenHints, setSeenHints] = useState<string[]>([]);
  // §2.9.1 — day/night: the sun + lights follow the sim clock (which the
  // EarthSimBridge advances in play mode). Polled at 1 Hz — the sun moves
  // slowly (a 600 s game day), so 1 Hz is smooth enough and cheap.
  const [dayNight, setDayNight] = useState({ sunPos: [120, 80, 60] as [number, number, number], day: 1 });
  useEffect(() => {
    const id = window.setInterval(() => {
      const hour = sim.clock.hour;
      setDayNight({ sunPos: sunPositionForHour(hour), day: sunDayFactor(hour) });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (apiKey || atlas) return;
    let cancel = false;
    (async () => {
      const api = await fetchTilesKey("/api/tiles-key");
      const file = api ? null : await fetchTilesKey("./tiles-key.json");
      let stored: string | null = null;
      try { stored = localStorage.getItem(KEY_STORE); } catch { /* private mode */ }
      const picked = pickTilesKey({ api, file, local: stored });
      if (cancel) return;
      if (picked) {
        setApiKey(picked.key);
        setKeySource(picked.source);
      }
      setKeyPending(false);
    })();
    return () => { cancel = true; };
  }, [apiKey, atlas]);
  useEffect(() => installInput(), []);
  useEffect(() => { sfx.setVolume(loadSettings().volume); }, []);
  useEffect(() => {
    const onErr = (event: ErrorEvent) => {
      setCrashText(formatCrash(event.message || "error", event.error instanceof Error ? event.error.stack : undefined, window.location.href));
    };
    const onReject = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      setCrashText(formatCrash(message, stack, window.location.href));
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);
  // §2.8.4 — restore the shared mission progress + stats once on boot.
  useEffect(() => { restoreEarth(); }, []);
  useEffect(() => {
    if (!apiKey) return;
    const intent = peekBoot();
    if (intent !== "earth-new" && intent !== "earth-continue") return;
    clearBoot();
    if (intent === "earth-new") {
      resetArc();
      setUseResume(false);
      const start = placeById("the-narrows");
      if (start) {
        setPlaceId(start.id);
        const next = anchorOf(start);
        setAnchor(next);
        playState.anchor = next;
        playState.placeId = start.id;
        playState.settled = false;
      }
    } else {
      setUseResume(true);
    }
    playState.paused = false;
    setPaused(false);
    useGame.getState().setPaused(false);
    useGame.getState().setStarted(true);
    setScreen("play");
    setMode("play");
    setWorldOn(true);
    sfx.startAmbience();
  }, [apiKey]);
  useEffect(() => {
    if (!worldOn) return;
    loadSliceCached("slice-newbedford.json").then(setSlice).catch((e) => console.error(e));
  }, [worldOn]);
  useEffect(() => { setReady(false); setTilesProblem(false); }, [placeId, mode]); // re-gate on teleport
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const bootedAnchor = useRef(false);
  useEffect(() => {
    const place = placeById(placeId);
    if (!place) return;
    playState.placeId = place.id;
    if (!bootedAnchor.current) {
      bootedAnchor.current = true;
      playState.anchor = anchorRef.current;
      return;
    }
    const next = anchorOf(place);
    setAnchor(next);
    playState.anchor = next;
    playState.settled = false;
  }, [placeId]);
  useEffect(() => {
    let cancel = false;
    setSnap(null);
    if (!worldOn) { setSnapWait(false); return; }
    const place = placeById(placeId);
    if (!place || place.sliceAligned) { setSnapWait(false); return; }
    const url = roadsSliceFor(place);
    if (!url) { setSnapWait(false); return; }
    setSnapWait(true);
    const timer = window.setTimeout(() => { if (!cancel) setSnapWait(false); }, 800);
    let frame = 0;
    loadSliceCached(url).then((city) => {
      // The slice parse and the road search stay on different frames.
      frame = window.requestAnimationFrame(() => {
        if (cancel) return;
        const hit = nearestRoadSpawn(city.roads, anchorOf(place), false);
        if (hit) setSnap({ x: hit.x, z: hit.z, heading: hit.heading });
        setSnapWait(false);
      });
    }).catch(() => { if (!cancel) setSnapWait(false); });
    return () => { cancel = true; window.clearTimeout(timer); if (frame) window.cancelAnimationFrame(frame); };
  }, [placeId, worldOn]);
  const onAnchor = useCallback((next: LatLon) => {
    playState.anchor = next;
    setAnchor(next);
  }, []);
  const mapRef = useRef(false);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.code === "F3") {
        e.preventDefault();
        setSettings((prev) => {
          const next = { ...prev, showPerf: !prev.showPerf };
          saveSettings(next);
          return next;
        });
        return;
      }
      if (e.code === "F1") { e.preventDefault(); setControlsOpen((open) => !open); return; }
      if (e.code === "KeyT") { advanceLine(); return; }
      if (e.code === actionCode("map")) { playState.tutorial.mapped = true; setMapOpen((open) => !open); return; }
      if (e.code === actionCode("camera")) { setView((v) => (v === "third" ? "first" : "third")); return; }
      const pauseKey = actionCode("pause");
      const isPause = e.code === "Escape" || (pauseKey !== "Escape" && e.code === pauseKey);
      if (!isPause) return;
      if (mapRef.current) { setMapOpen(false); return; }
      if (screenRef.current !== "play") return;
      setPaused((p) => { const next = !p; playState.paused = next; useGame.getState().setPaused(next); return next; });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const earthLocal = useMemo(() => (typeof window === "undefined" ? null : loadEarthLocal()), []);
  const savedPos = useMemo(() => (typeof window === "undefined" ? null : loadEarthPos()), []);
  const weatherHold = useRef(false);
  useEffect(() => {
    const order: Weather[] = ["clear", "clear", "cloudy", "rain", "cloudy"];
    let i = 0;
    const id = setInterval(() => {
      if (weatherHold.current) return;
      i = (i + 1) % order.length;
      setWeather(order[i]);
    }, 45000);
    return () => clearInterval(id);
  }, []);
  const { roads: liveRoads, url: liveUrl } = useLiveCityRoads(placeId, worldOn);
  mapRef.current = mapOpen;

  if (!apiKey && atlas) return <AtlasPreview />;
  if (!apiKey && keyPending) return <KeyLoading />;
  if (!apiKey) return <NoKeyNotice onLaunch={(key) => { setApiKey(key); setKeySource("local"); }} />;

  const place = placeById(placeId) ?? placeById(DEFAULT_PLACE_ID)!;
  const resumedHere = useResume && !!earthLocal && earthLocal.placeId === place.id;
  const defaultSpawn = place.sliceAligned && slice
    ? computeSpawn(slice)
    : snap ?? { x: 0, z: 0, heading: place.heading };
  const spawn = resumedHere
    ? { x: earthLocal!.x, z: earthLocal!.z, heading: earthLocal!.heading }
    : useResume && place.sliceAligned && savedPos && Math.hypot(savedPos.x - defaultSpawn.x, savedPos.z - defaultSpawn.z) < 5000
      ? { x: savedPos.x, z: savedPos.z, heading: savedPos.heading }
      : defaultSpawn;
  const holdForSnap = mode === "play" && !resumedHere && !place.sliceAligned && snapWait && !snap;
  const begin = (fresh: boolean) => {
    if (fresh) {
      resetArc();
      setUseResume(false);
      const start = placeById("the-narrows") ?? place;
      setPlaceId(start.id);
      const next = anchorOf(start);
      setAnchor(next);
      playState.anchor = next;
      playState.placeId = start.id;
      playState.settled = false;
    } else {
      setUseResume(true);
    }
    playState.paused = false;
    setPaused(false);
    useGame.getState().setPaused(false);
    useGame.getState().setStarted(true);
    setScreen("play");
    setMode("play");
    setWorldOn(true);
    sfx.startAmbience();
  };
  const wx = WX[weather];

  return (
    <>
      {worldOn && (
      <Canvas
        shadows
        dpr={[1, QUALITY_PRESET[tier].dprMax]}
        frameloop={paused || activity.loop === "demand" || glLost ? "demand" : "always"}
        camera={{ position: [0, 0, 2e7], near: 0.5, far: 1e8 }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1 }}
      >
        <ContextGuard
          onLost={() => { saveEarth(); setGlLost(true); setLostAt(Date.now()); }}
          onRestored={() => { setGlLost(false); setLostAt(null); setTilesKey((k) => k + 1); }}
        />
        <QualityScaler preference={settings.quality} onTier={setTier} />
        <GamepadPause onToggle={() => { if (screenRef.current !== "play") return; setPaused((p) => { const next = !p; playState.paused = next; useGame.getState().setPaused(next); return next; }); }} />
        <color attach="background" args={[wx.bg]} />
        {mode === "play" && <fog attach="fog" args={[wx.bg, wx.fog[0], wx.fog[1]]} />}
        {/* §2.9.1 — the Sky sun follows the sim clock's hour (rises east,
            sets west); the sun + hemisphere dim at night (a 5% moonlight
            floor keeps the world readable, it never goes pitch black). */}
        {wx.sky && <Sky sunPosition={dayNight.sunPos} turbidity={weather === "cloudy" ? 8 : 3} rayleigh={1.2} />}
        <hemisphereLight args={["#dceaff", "#8a8678", 0.9 * (0.3 + 0.7 * dayNight.day)]} />
        <directionalLight position={dayNight.sunPos} intensity={wx.sun * (0.05 + 0.95 * dayNight.day)} color={wx.sunColor} castShadow />
        <EnvLight />

        <Suspense fallback={null}>
        {/* errorTarget: the higher it is, the coarser/faster tiles load. Street-
            level (play) cameras need this raised or the deepest LOD never streams
            in and the ground stays blank. */}
        <TilesRenderer key={`${apiKey}:${tilesKey}`} errorTarget={QUALITY_PRESET[tier].errorTarget} enabled={activity.tilesEnabled && !glLost}>
          {/* §2.1.3/2.1.5/2.3: auth plugin with guarded dispose, memory caps
              (maxDepth 24, LRU byte/count bounds, job limits), classified tile
              faults, and a redacting log guard — replaces the bare TilesPlugin. */}
          <GoogleTilesAuth apiToken={apiKey} onFault={(f) => setFault((cur) => mergeFault(cur, f))} />
          <QualityCaps tier={tier} />
          {/* BVH-accelerated collision raycasts + bounded tile memory (prevents
              the street-level hitching and GPU-OOM WebGL context loss). */}
          <TilesBVH />
          <TilesDiag onMissing={() => setTilesProblem(true)} onOk={() => setTilesProblem(false)} />

          {mode === "orbit" ? (
            <>
              <FlyTo lat={anchor.lat} lon={anchor.lon} />
              <GlobeControls enableDamping />
            </>
          ) : (
            (slice || !place.sliceAligned) && (
              <EastNorthUpFrame lat={anchor.lat * DEG_TO_RAD} lon={anchor.lon * DEG_TO_RAD} height={0}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                  {!holdForSnap && (
                    <PlayerRig key={place.id} spawn={spawn} view={view} onReady={() => setReady(true)} onAnchor={onAnchor} roads={liveRoads} wet={weather === "rain"} />
                  )}
                  <CityLife key={liveUrl ?? "none"} roads={liveRoads} />
                  {/* §2.8 — shared sim bridge + mission runner (same sim layer
                      as the stylized build; no duplicate sim stack). */}
                  <EarthSimBridge slice={slice} weather={weather} />
                  {mode === "play" && <EarthMissionRunner />}
                  {/* §2.10.1 — fallback ground plane when the tiles fail, so
                      the player walks on something instead of void. */}
                  {shouldShowFallbackGround({ fault: !!fault, tilesProblem }) && (
                    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
                      <planeGeometry args={[FALLBACK_GROUND_SIZE, FALLBACK_GROUND_SIZE]} />
                      <meshStandardMaterial color="#3a3f4a" roughness={1} />
                    </mesh>
                  )}
                  <Ambient weather={weather} />
                </group>
              </EastNorthUpFrame>
            )
          )}

          <TilesAttributionOverlay />
        </TilesRenderer>
        </Suspense>
      </Canvas>
      )}

      <Hud
        mode={mode} setMode={setMode}
        view={view} setView={setView}
        placeId={placeId} setPlaceId={setPlaceId}
        weather={weather}
        anchor={anchor}
        onOpenMap={() => setMapOpen(true)}
        settings={settings}
        tier={tier}
        controlsOpen={controlsOpen}
        onCloseControls={() => setControlsOpen(false)}
        seenHints={seenHints}
        onSeen={(id) => setSeenHints((prev) => prev.includes(id) ? prev : [...prev, id])}
      />
      {mapOpen && (
        <EarthBigMap
          anchor={anchor}
          placeId={place.id}
          onClose={() => setMapOpen(false)}
          onTeleport={(id) => { setPlaceId(id); setMode("play"); setMapOpen(false); }}
        />
      )}
      <Radio />
      {screen === "play" && <TouchControls />}
      {screen === "play" && mode === "play" && (
        <CoastExtras pose={() => {
          const ll = localToLatLon(playState.anchor, playState.player.pos.x, playState.player.pos.z);
          return { lat: ll.lat, lon: ll.lon, driving: playState.player.driving, paused: playState.paused };
        }} />
      )}
      {screen === "title" && (
        <TitleScreen canContinue={!!earthLocal} onContinue={() => begin(false)} onNew={() => begin(true)} onSettings={setSettings} />
      )}
      {screen === "play" && paused && (
        <PauseScreen
          onResume={() => { playState.paused = false; setPaused(false); useGame.getState().setPaused(false); }}
          onMap={() => { playState.paused = false; setPaused(false); useGame.getState().setPaused(false); setMapOpen(true); }}
          onTitle={() => { playState.paused = false; setPaused(false); useGame.getState().setPaused(false); useGame.getState().setStarted(false); setMode("orbit"); setScreen("title"); }}
          onSave={() => saveEarth()}
          onSettings={setSettings}
          weather={weather}
          setWeather={(w) => { weatherHold.current = true; setWeather(w); }}
        />
      )}
      {screen === "play" && mode === "play" && !paused && <DriveHint />}
      {mode === "play" && screen === "play" && !holdForSnap && !ready && !tilesProblem && !fault && <Loading />}
      {tilesProblem && !fault && <TilesProblem notice={earthFallbackNotice(null, true)} />}
      {fault && (
        <TileFaultOverlay
          fault={fault}
          notice={fault.kind === "unauthorized" || fault.kind === "quota" ? null : earthFallbackNotice(fault, tilesProblem)}
          canRekey={keySource === "dev" || keySource === "local"}
          onRetry={() => { setFault(null); setTilesProblem(false); setTilesKey((k) => k + 1); }}
          onDismiss={() => setFault(null)}
        />
      )}
      {glLost && lostAt != null && <GlLostNotice since={lostAt} />}
      {controlsOpen && (
        <div id="controls-overlay" style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 320, zIndex: 36, background: "#0c1018", border: "1px solid #2c3a5e", borderRadius: 10, padding: 14, color: "#e7e0ff", font: "13px/1.45 'Courier New', monospace" }}>
          <b style={{ color: "#7ad9ff" }}>Controls</b>
          {CONTROLS_TEXT.map((row) => <div key={row} style={{ marginTop: 4 }}>{row}</div>)}
          <button onClick={() => setControlsOpen(false)} style={{ marginTop: 10, cursor: "pointer", border: "1px solid #2c3a5e", background: "#7ad9ff", color: "#04121a", fontWeight: 700, padding: "6px 12px", borderRadius: 6 }}>Close</button>
        </div>
      )}
      {crashText && <CrashOverlay text={crashText} onClose={() => setCrashText(null)} />}
    </>
  );
}

// Watches the tile renderer: logs load errors and, if no tiles have appeared
// after a grace period, flags a likely key/quota/billing problem (vs. our code).
function TilesDiag({ onMissing, onOk }: { onMissing: () => void; onOk: () => void }) {
  const tiles = useContext(TilesRendererContext);
  useEffect(() => {
    if (!tiles) return;
    const t = tiles as unknown as { group?: { children?: unknown[] }; addEventListener: (k: string, f: (e: unknown) => void) => void; removeEventListener: (k: string, f: (e: unknown) => void) => void };
    const onErr = (e: unknown) => console.warn("[tiles] load-error:", (e as { error?: unknown })?.error ?? e);
    t.addEventListener("load-error", onErr);
    const id = window.setInterval(() => {
      const n = t.group?.children?.length ?? 0;
      if (n > 0) { onOk(); } else { onMissing(); }
    }, 6000);
    return () => { t.removeEventListener("load-error", onErr); clearInterval(id); };
  }, [tiles, onMissing, onOk]);
  return null;
}

function TilesProblem({ notice }: { notice: string | null }) {
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 5, maxWidth: 460, background: "rgba(40,10,10,.9)", border: "1px solid #7a2c2c", borderRadius: 8, padding: "10px 14px", color: "#ffd9d9", font: "12px/1.5 'Courier New', monospace", textAlign: "center" }}>
      <b>Photoreal tiles aren't loading.</b> The map data isn't coming back from Google —
      almost always the API key: Map Tiles API not enabled, billing off, or over quota.
      Check the key in Google Cloud, then reload. (Movement still works; you're just on an empty surface.)
      {notice && <div style={{ marginTop: 8, opacity: 0.95 }}>{notice}</div>}
    </div>
  );
}

// §2.1.6: recover from (rather than hard-crash on) a lost WebGL context.
// The app pauses the frame loop and shows a HUD notice until the context
// is restored; the player never has to reload.
function ContextGuard({ onLost, onRestored }: { onLost: () => void; onRestored: () => void }) {
  const gl = useThree((s) => s.gl);
  const lostRef = useRef(onLost);
  const restoredRef = useRef(onRestored);
  lostRef.current = onLost;
  restoredRef.current = onRestored;
  useEffect(() => {
    const c = gl.domElement;
    const onLostEv = (e: Event) => { e.preventDefault(); console.warn("[earth] WebGL context lost — pausing render"); lostRef.current(); };
    const onRestoredEv = () => { console.warn("[earth] WebGL context restored"); restoredRef.current(); };
    c.addEventListener("webglcontextlost", onLostEv);
    c.addEventListener("webglcontextrestored", onRestoredEv);
    return () => { c.removeEventListener("webglcontextlost", onLostEv); c.removeEventListener("webglcontextrestored", onRestoredEv); };
  }, [gl]);
  return null;
}

// QualityScaler replaces the one-shot watchdog. shouldDegrade stays in frameLoop
// for the stability tests; the live tier uses nextQuality so it can step back up.

// §2.3: distinct copy per fault kind + a retry that re-mounts the tiles
// renderer without a page reload. The canvas is never blank: movement still
// runs on the fallback ground (§2.10) while this overlay is up.
function TileFaultOverlay({ fault, notice, canRekey, onRetry, onDismiss }: { fault: TileFault; notice: string | null; canRekey: boolean; onRetry: () => void; onDismiss: () => void }) {
  const copy = faultCopy(fault);
  const blocking = fault.kind === "unauthorized" || fault.kind === "quota";
  // A pasted or ?key= override can be cleared. A key served by the site
  // cannot — reloading would just fetch the same one.
  const rekey = () => {
    try { localStorage.removeItem(KEY_STORE); } catch { /* private mode */ }
    try { sessionStorage.removeItem(DEV_TILES_KEY); } catch { /* private mode */ }
    location.reload();
  };
  const card = (
    <div id="tiles-fault" style={{ maxWidth: 480, background: "#1c0c0c", border: "1px solid #7a2c2c", borderRadius: 10, padding: "16px 18px", color: "#ffd9d9", font: "13px/1.5 'Courier New', monospace", textAlign: "center", boxShadow: "0 16px 48px rgba(0,0,0,.45)" }}>
      <b>{copy.title}</b>
      <div style={{ margin: "6px 0 12px", opacity: 0.95 }}>{copy.body}</div>
      {notice && <div style={{ margin: "0 0 12px", opacity: 0.95 }}>{notice}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onRetry} style={{ cursor: "pointer", border: "1px solid #7a2c2c", background: "#7ad9ff", color: "#04121a", fontWeight: 700, padding: "6px 14px", borderRadius: 6, font: "12px 'Courier New', monospace" }}>
          RETRY TILES
        </button>
        {canRekey && fault.kind === "unauthorized" && (
          <button onClick={rekey} style={{ cursor: "pointer", border: "1px solid #7a2c2c", background: "transparent", color: "#ffd9d9", padding: "6px 14px", borderRadius: 6, font: "12px 'Courier New', monospace" }}>
            USE A DIFFERENT KEY
          </button>
        )}
        <button onClick={onDismiss} style={{ cursor: "pointer", border: "1px solid #7a2c2c", background: "transparent", color: "#ffd9d9", padding: "6px 14px", borderRadius: 6, font: "12px 'Courier New', monospace" }}>
          KEEP PLAYING (NO TILES)
        </button>
      </div>
    </div>
  );
  if (blocking) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,7,13,.55)", padding: 24 }}>
        {card}
      </div>
    );
  }
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 5 }}>
      {card}
    </div>
  );
}

function GlLostNotice({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const stuck = now - since > 8000;
  return (
    <div style={{ position: "fixed", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 6, background: "rgba(40,30,5,.92)", border: "1px solid #8a6a2c", borderRadius: 8, padding: "8px 14px", color: "#ffe9b0", font: "12px 'Courier New', monospace", textAlign: "center" }}>
      Graphics paused — restoring…
      {stuck && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => window.location.reload()} style={{ cursor: "pointer", border: "1px solid #8a6a2c", background: "#ffe9b0", color: "#2a2208", fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}>
            RELOAD
          </button>
        </div>
      )}
    </div>
  );
}

function QualityScaler({ preference, onTier }: { preference: QualityChoice; onTier: (tier: QualityName) => void }) {
  const samples = useRef<number[]>([]);
  const tier = useRef<QualityName>(preference === "auto" ? "high" : preference);
  useEffect(() => {
    if (preference === "auto") return;
    tier.current = preference;
    onTier(preference);
  }, [preference, onTier]);
  useFrame((_, dt) => {
    samples.current.push(Math.min(dt, 0.25));
    if (samples.current.length > 180) samples.current.shift();
    if (samples.current.length % 30 !== 0) return;
    const heap = readHeap();
    const next = nextQuality(
      tier.current,
      meanOf(samples.current),
      samples.current.length,
      memoryBand(heap?.used ?? null, heap?.limit ?? null),
      preference !== "auto",
    );
    playState.fps = samples.current.length ? Math.round(1 / Math.max(0.001, meanOf(samples.current))) : 0;
    if (next === tier.current) return;
    tier.current = next;
    playState.tier = next;
    onTier(next);
  });
  return null;
}

function QualityCaps({ tier }: { tier: QualityName }) {
  const tiles = useContext(TilesRendererContext);
  useLayoutEffect(() => {
    if (tiles) applyTileMemoryCaps(tiles as unknown as TileMemoryHost, capsForTier(tier));
  }, [tiles, tier]);
  return null;
}

function GamepadPause({ onToggle }: { onToggle: () => void }) {
  useFrame(() => { if (consumeTap("KeyP")) onToggle(); });
  return null;
}

function readHeap(): { used: number; limit: number } | null {
  const memory = (performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (!memory) return null;
  return { used: memory.usedJSHeapSize, limit: memory.jsHeapSizeLimit };
}

function FlyTo({ lat, lon }: { lat: number; lon: number }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const d2r = Math.PI / 180;
    const ground = new THREE.Vector3();
    const eye = new THREE.Vector3();
    WGS84_ELLIPSOID.getCartographicToPosition(lat * d2r, lon * d2r, 0, ground);
    WGS84_ELLIPSOID.getCartographicToPosition((lat - 0.014) * d2r, lon * d2r, 1400, eye);
    camera.up.copy(ground).normalize();
    camera.position.copy(eye);
    camera.lookAt(ground);
    camera.updateProjectionMatrix();
  }, [camera, lat, lon]);
  return null;
}

function Hud(props: {
  mode: "play" | "orbit"; setMode: (m: "play" | "orbit") => void;
  view: View; setView: (v: View) => void;
  placeId: string; setPlaceId: (id: string) => void;
  weather: Weather;
  anchor: { lat: number; lon: number };
  onOpenMap: () => void;
  settings: EarthSettings;
  tier: QualityName;
  controlsOpen: boolean;
  onCloseControls: () => void;
  seenHints: string[];
  onSeen: (id: string) => void;
}) {
  const { mode, setMode, view, setView, placeId, setPlaceId, weather, anchor, onOpenMap, settings, tier, controlsOpen, onCloseControls, seenHints, onSeen } = props;
  // §2.5 — HUD parity: the reactive values come from the shared stores
  // (useMission, useStats); the per-frame values (heading, nav distance,
  // car distance) are polled at 2 Hz — fast enough for a HUD, cheap enough
  // to not re-render every frame.
  const mission = useMission();
  const cash = useStats((s) => s.cash);
  const health = useStats((s) => s.health);
  const police = useStats((s) => s.police);
  const { roads, url } = useLiveCityRoads(placeId);
  const aligned = liveRoadsAligned(url, anchor);
  const [live, setLive] = useState({ heading: 0, navDist: 0, carDist: Infinity, driving: false, x: 0, z: 0, speed: 0, hour: 9, arc: "", job: "", body: 100, fps: 0, rebases: 0, who: "", line: "", tutorial: "", hint: "", hintId: "" });
  useEffect(() => {
    const id = window.setInterval(() => {
      const p = playState.player;
      const arc = currentArc();
      const job = currentJob();
      const spoken = currentLine();
      const step = tutorialStep(playState.tutorial);
      const hint = nextHint({
        damaged: playState.condition.body < 100 || playState.condition.engine < 100,
        heat: useStats.getState().police > 0.4,
        driving: p.driving,
      }, seenHints);
      setLive({
        heading: p.heading,
        navDist: shared.navDist ?? 0,
        carDist: p.carDist,
        driving: p.driving,
        x: p.pos.x,
        z: p.pos.z,
        speed: p.speed,
        hour: shared.hour,
        arc: arc ? arc.text : "",
        job: job ? `${job.job.title} — ${job.step.text}` : "",
        body: playState.condition.body,
        fps: playState.fps,
        rebases: playState.rebases,
        who: spoken?.who ?? "",
        line: spoken?.text ?? "",
        tutorial: step?.text ?? "",
        hint: hint?.text ?? "",
        hintId: hint?.id ?? "",
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [seenHints]);
  const compass = headingToCompass(live.heading);
  const navKm = live.navDist > 0 ? (live.navDist >= 1000 ? `${(live.navDist / 1000).toFixed(1)} km` : `${Math.round(live.navDist)} m`) : null;
  const where = describeLocation(anchor, live.x, live.z, roads, aligned);
  const enterKey = actionCode("interact").replace(/^Key/, "");
  const brakeKey = actionCode("handbrake") === "Space" ? "Space" : actionCode("handbrake").replace(/^Key/, "");
  const prompt = mode === "play"
    ? live.driving
      ? `${enterKey} — Exit car · ${brakeKey} — brake`
      : live.carDist < 5.5
        ? `${enterKey} — Enter car`
        : null
    : null;
  const clock = `${String(Math.floor(live.hour) % 24).padStart(2, "0")}:${String(Math.floor((live.hour % 1) * 60)).padStart(2, "0")}`;
  const btn = (active: boolean): React.CSSProperties => ({
    pointerEvents: "auto", cursor: "pointer", border: "1px solid #2c3a5e",
    background: active ? "#7ad9ff" : "rgba(5,7,13,.8)", color: active ? "#04121a" : "#e7e0ff",
    font: "11px 'Courier New', monospace", fontWeight: 700, padding: "5px 9px", borderRadius: 6,
  });
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", font: "12px/1.5 'Courier New', monospace", color: "#e7e0ff" }}>
      <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(5,7,13,.82)", border: "1px solid #2c3a5e", borderRadius: 8, padding: "10px 12px", maxWidth: 380 }}>
        <b style={{ color: "#7ad9ff" }}>THE NARROWS</b>
        <span style={{ opacity: 0.7 }}> · photoreal</span>
        <div style={{ marginTop: 2 }}>
          <b>{where.title}</b>
          <span style={{ opacity: 0.75 }}> · {where.detail}</span>
          {live.driving && <span> · {speedMph(live.speed)} mph</span>}
          <span> · {clock}</span>
        </div>
        <div style={{ opacity: 0.85, margin: "3px 0 8px" }}>
          {mode === "play"
            ? `WASD · Shift run · H horn · M map · weather: ${weather}`
            : "Orbit: drag to look, scroll to zoom. M opens the map."}
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 6, fontSize: 11 }}>
          <span>{settings.colorblind ? `HP ${Math.round(health)}` : `♥ ${Math.round(health)}`}</span>
          <span>{settings.colorblind ? `POLICE ${Math.round(police)}` : `${"★".repeat(Math.round(police))}${"☆".repeat(5 - Math.round(police))}`}</span>
          <span>${Math.round(cash)}</span>
          <span>{compass.cardinal} {compass.bearing}°</span>
          {live.driving && <span>BODY {Math.round(live.body)}</span>}
        </div>
        {mode === "play" && live.who && (
          <div id="subtitle-line" style={{ marginBottom: 6, fontSize: 12 * settings.subtitleScale, color: "#f4efe2" }}>
            <b>{live.who}</b> — {live.line}
            <span style={{ opacity: 0.6 }}> · T</span>
          </div>
        )}
        {mode === "play" && live.tutorial && (
          <div id="tutorial-line" style={{ marginBottom: 6, fontSize: 12 * settings.subtitleScale, color: "#7ad9ff" }}>
            {live.tutorial}
          </div>
        )}
        {mode === "play" && live.arc && (
          <div style={{ marginBottom: 6, fontSize: 11 * settings.subtitleScale, color: "#ffcf4a" }}>
            <b>THE NARROWS</b> — {live.arc}
            {navKm && <span> · {navKm}</span>}
          </div>
        )}
        {mode === "play" && !live.arc && live.job && (
          <div style={{ marginBottom: 6, fontSize: 11 * settings.subtitleScale, color: "#ffcf4a" }}>
            <b>JOB</b> — {live.job}
            {navKm && <span> · {navKm}</span>}
          </div>
        )}
        {mode === "play" && !live.arc && !live.job && !mission.done && (
          <div style={{ marginBottom: 6, fontSize: 11 * settings.subtitleScale, color: "#ffcf4a" }}>
            <b>{mission.title}</b> — {mission.objective}
            {navKm && <span> · {navKm}</span>}
          </div>
        )}
        {mode === "play" && !live.arc && !live.job && mission.done && (
          <div style={{ marginBottom: 6, fontSize: 11, color: "#7CFC00" }}>Campaign complete — the Narrows is yours.</div>
        )}
        {prompt && (
          <div style={{ marginBottom: 6, fontSize: 11 * settings.subtitleScale, color: "#7ad9ff" }}>{prompt}</div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          <button style={btn(mode === "play")} onClick={() => setMode("play")}>PLAY</button>
          <button style={btn(mode === "orbit")} onClick={() => setMode("orbit")}>ORBIT</button>
          <button style={btn(view === "third")} onClick={() => setView("third")}>3RD</button>
          <button style={btn(view === "first")} onClick={() => setView("first")}>1ST</button>
          <button style={btn(false)} onClick={onOpenMap}>MAP</button>
        </div>
        <label style={{ display: "block", opacity: 0.7, fontSize: 10, marginBottom: 3 }}>GO TO</label>
        <select
          value={placeId}
          onChange={(e) => { setPlaceId(e.target.value); setMode("play"); }}
          style={{ pointerEvents: "auto", width: "100%", background: "#0c0f1a", color: "#e7e0ff", border: "1px solid #2c3a5e", borderRadius: 6, padding: "6px 8px", font: "12px 'Courier New', monospace" }}
        >
          {REGIONS.map((region) => (
            <optgroup key={region.id} label={region.name}>
              {placesInRegion(region.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.detail}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div style={{ opacity: 0.55, fontSize: 9, marginTop: 8 }}>
          Tiles © Google · Roads © OpenStreetMap
        </div>
      </div>
      {mode === "play" && (
        <div style={{ position: "absolute", right: 12, bottom: 12 }}>
          <EarthMinimap anchor={anchor} placeId={placeId} />
        </div>
      )}
      {live.hint && (
        <div id="hint-line" style={{ position: "absolute", left: 12, bottom: 48, maxWidth: 360, background: "rgba(5,7,13,.88)", border: "1px solid #2c3a5e", borderRadius: 8, padding: "8px 10px", pointerEvents: "auto" }}>
          {live.hint}
          <button style={{ ...btn(false), marginLeft: 8 }} onClick={() => onSeen(live.hintId)}>OK</button>
        </div>
      )}
      {settings.showPerf && (
        <div id="perf-line" style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(5,7,13,.82)", border: "1px solid #2c3a5e", borderRadius: 6, padding: "4px 8px", fontSize: 11 }}>
          {live.fps || "—"} fps · {tier} · rebase {live.rebases}
          {(() => { const heap = readHeap(); return heap ? ` · ${Math.round(heap.used / (1024 * 1024))} MB` : ""; })()}
        </div>
      )}
    </div>
  );
}

function AtlasPreview() {
  const [id, setId] = useState("the-narrows");
  const place = placeById(id) ?? placeById("the-narrows")!;
  return (
    <EarthBigMap
      anchor={anchorOf(place)}
      placeId={place.id}
      pose={{ x: 0, z: 0, heading: place.heading }}
      onClose={() => {}}
      onTeleport={setId}
      showClose={false}
      notice="Atlas preview. This chart does not need a map key."
    />
  );
}

const LOAD_TIPS = [
  "The car is parked beside you. E gets in.",
  "M is the map. The arrow is you.",
  "I-195 runs east from Fall River toward the Cape.",
  "Stars fade if you stay clean.",
  "F3 hides the performance line.",
  "Hold R while stopped to repair the car.",
];

function Loading() {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTip((n) => (n + 1) % LOAD_TIPS.length), 3200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div id="loading-screen" style={{ position: "fixed", inset: 0, zIndex: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,7,13,.72)" }}>
      <div style={{ width: "min(420px, calc(100vw - 32px))", background: "#0c1018", border: "1px solid #2c3a5e", borderRadius: 12, padding: "22px 24px", color: "#e7e0ff", font: "14px/1.5 'Courier New', monospace" }}>
        <div style={{ color: "#7ad9ff", letterSpacing: 2, marginBottom: 8 }}>THE NARROWS</div>
        <div>Streaming the coast…</div>
        <div style={{ margin: "14px 0", height: 4, background: "#1c2740", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "35%", background: "#7ad9ff", animation: "narrows-load 1.4s ease-in-out infinite" }} />
        </div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{LOAD_TIPS[tip]}</div>
      </div>
      <style>{`@keyframes narrows-load { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }`}</style>
    </div>
  );
}

function CrashOverlay({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div id="crash-overlay" style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,7,13,.72)", padding: 24 }}>
      <div style={{ maxWidth: 520, width: "100%", background: "#1c0c0c", border: "1px solid #7a2c2c", borderRadius: 10, padding: 16, color: "#ffd9d9", font: "13px/1.45 'Courier New', monospace" }}>
        <b>Something broke</b>
        <pre style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto", background: "#140808", padding: 8, borderRadius: 6 }}>{text}</pre>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ cursor: "pointer", border: "1px solid #7a2c2c", background: "#7ad9ff", color: "#04121a", fontWeight: 700, padding: "6px 12px", borderRadius: 6 }}
            onClick={() => { void navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => setCopied(false)); }}
          >
            {copied ? "COPIED" : "COPY"}
          </button>
          <button style={{ cursor: "pointer", border: "1px solid #7a2c2c", background: "transparent", color: "#ffd9d9", padding: "6px 12px", borderRadius: 6 }} onClick={onClose}>
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyLoading() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#e7e0ff", background: "#05070d", font: "14px 'Courier New', monospace" }}>
      Connecting to the map…
    </div>
  );
}

function NoKeyNotice({ onLaunch }: { onLaunch: (key: string) => void }) {
  const [val, setVal] = useState("");
  const [bad, setBad] = useState(false);
  const save = () => {
    const k = normalizeTilesKey(val);
    if (!k) { setBad(true); return; }
    try { localStorage.setItem(KEY_STORE, k); } catch { /* private mode */ }
    onLaunch(k);
  };
  return (
    <div id="tiles-key-missing" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#e7e0ff", background: "#05070d", font: "14px/1.6 'Courier New', monospace", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 560 }}>
        <h2 style={{ color: "#7ad9ff" }}>Photoreal streets need a map key</h2>
        <p>This page looks for a Map Tiles key configured for the site. None was found, so the 3D map stays off. You do not put a key in the address bar.</p>
        <p style={{ textAlign: "left", background: "#0c0f1a", padding: 12, borderRadius: 8 }}>
          Playing on your own machine? Paste a Map Tiles key below. It stays in this browser only.
          The site itself is configured in <b>ENV.md</b> — a Vercel env var, a build-time <b>VITE_</b> var, or a <b>tiles-key.json</b> file beside this page.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            placeholder="Paste a Map Tiles key"
            spellCheck={false} autoCapitalize="off" autoCorrect="off"
            style={{ flex: 1, background: "#0c0f1a", color: "#e7e0ff", border: "1px solid #2c3a5e", borderRadius: 6, padding: "8px 10px", font: "13px 'Courier New', monospace" }}
          />
          <button onClick={save} style={{ cursor: "pointer", border: "1px solid #2c3a5e", background: "#7ad9ff", color: "#04121a", fontWeight: 700, padding: "8px 16px", borderRadius: 6 }}>
            LAUNCH
          </button>
        </div>
        {bad && <p style={{ color: "#ffb4b4" }}>That doesn't look like a Map Tiles key.</p>}
        <p style={{ opacity: 0.6, fontSize: 11, marginTop: 10 }}>
          Developers can pass <code style={{ color: "#9fd8ff" }}>?key=</code> for this browser tab only.
          Google bills per tile session and its terms govern use.
        </p>
        <p style={{ marginTop: 14 }}>
          <a href="./index.html" style={{ color: "#d2b782" }}>Street map</a>
          {" · "}this page is the 3D Tiles build
        </p>
      </div>
    </div>
  );
}
