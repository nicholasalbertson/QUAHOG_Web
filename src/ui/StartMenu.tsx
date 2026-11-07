import { useState } from "react";
import { useGame } from "../store";
import { useStats } from "../game";
import { useMission } from "../mission";
import { useEconomy } from "../economy";
import { useInventory } from "../inventory";
import { sfx } from "../audio/sfx";
import { canContinue, clearAllSaves, hasRecoverableTmp } from "../sim/SaveGame";
import { worldJournal } from "../world/worldJournal";
import { useToasts } from "../store";

// Title / start screen (§22). Shown over the loading world until the player
// presses Play; doubles as the first user gesture that unlocks audio.

const TIPS = [
  "WASD to move · Shift to sprint · E to grab a car.",
  "G draws your pistol — click to fire. F throws hands. R reloads.",
  "Heat climbs when you cause trouble. Lay low at the safehouse.",
  "Ram a car to stop it, then jack it on foot with E.",
  "Press M for the map, C for your character, ⚙ to lay out touch controls.",
  "Buy fronts around the city (B) — they pay out every day.",
  "FPS soak: open with ?debug&soak=1&perf=1 and drive the NB ring 30 min.",
];

const TUTORIAL_KEY = "mounthope.tutorial.v1";

function pushFirstRunTips() {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(TUTORIAL_KEY)) return;
    localStorage?.setItem(TUTORIAL_KEY, "1");
  } catch { /* private mode */ }
  const push = useToasts.getState().push;
  // Stagger so the toast stack is readable.
  push("Move: WASD · Sprint: Shift", "#ffcf4a");
  setTimeout(() => push("Drive: E to enter a car · Space handbrake", "#ffcf4a"), 900);
  setTimeout(() => push("Mission: follow the gold marker — check the HUD", "#ffcf4a"), 1800);
}

export function StartMenu({ sliceName, progress = 0 }: { sliceName: string; progress?: number }) {
  const started = useGame((s) => s.started);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [gate] = useState(() => canContinue());
  const [canRecover] = useState(() => hasRecoverableTmp());
  const save = gate.ok;
  const loaded = sliceName !== "loading…";
  if (started) return null;
  const pct = Math.round(progress * 100);

  const play = () => {
    sfx.setVolume(0.5);
    useGame.getState().setStarted(true);
    pushFirstRunTips();
  };
  const newGame = () => {
    clearAllSaves();
    useStats.getState().reset();
    useMission.getState().reset();
    useEconomy.setState({ owned: {} });
    useInventory.getState().reset();
    worldJournal.reset(); // a new life has its own event history
    useGame.getState().resetSession(); // clear bat/photo/waypoint/scrimshaw & remount per-game props
    try { localStorage?.removeItem(TUTORIAL_KEY); } catch { /* ignore */ }
    play();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 30, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      background: "radial-gradient(ellipse at 50% 40%, rgba(31,54,62,.66), rgba(9,24,31,.96))",
      fontFamily: "'Narrows Sans', system-ui, sans-serif", color: "#e9e8df",
    }}>
      <div style={{ fontSize: 13, letterSpacing: 8, color: "#d2b782", opacity: 0.9 }}>SOUTHCOAST · 2026</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(34px, 7vw, 76px)", fontWeight: 900, letterSpacing: 6, color: "#fff", textShadow: "0 4px 25px rgba(0,0,0,.3)", lineHeight: 1 }}>
        THE NARROWS
      </div>
      <div style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>New Bedford · Fall River · the Narrows</div>

      <div style={{ marginTop: 34, display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: "92vw", gap: 14 }}>
        {save && (
          <button disabled={!loaded} onClick={play} style={btn(loaded, true)}>{loaded ? "CONTINUE" : "LOADING…"}</button>
        )}
        <button disabled={!loaded} onClick={newGame} style={btn(loaded, !save)}>
          {loaded ? (save ? "✦ NEW GAME" : "NEW GAME") : "LOADING…"}
        </button>
      </div>

      {!save && gate.reason && (
        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.45, fontFamily: "'Courier New', monospace" }}>
          Continue unavailable — {gate.reason}
        </div>
      )}

      {canRecover && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#ffb0b8", maxWidth: 420 }}>
          A backup save was found after an interrupted write — use the recovery banner below to restore.
        </div>
      )}

      {!loaded && (
        <div style={{ marginTop: 22, width: 280 }}>
          <div style={{ height: 6, borderRadius: 4, background: "rgba(120,110,150,.25)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#b6c5c3", transition: "width .2s ease" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, letterSpacing: 1 }}>LOADING NEW BEDFORD · {pct}%</div>
        </div>
      )}

      <a href="earth.html" style={{
        marginTop: 18, textDecoration: "none", pointerEvents: "auto",
        padding: "9px 20px", borderRadius: 8, border: "1px solid #2c6a8e",
        background: "rgba(20,40,60,.7)", color: "#9fe0ff", fontFamily: "'Narrows Sans', system-ui, sans-serif",
        fontSize: 13, fontWeight: 700, letterSpacing: 1,
      }}>
        🛰 PHOTOREAL MODE (3D TILES)
      </a>

      <div style={{ marginTop: 22, fontSize: 12, opacity: 0.6, maxWidth: 420 }}>TIP: {tip}</div>
      <div style={{ position: "absolute", bottom: 12, fontSize: 10, opacity: 0.5 }}>
        Map data © OpenStreetMap contributors, ODbL · Imagery © Esri, Maxar, Earthstar Geographics · An original work
      </div>
    </div>
  );
}

function btn(loaded: boolean, primary: boolean): React.CSSProperties {
  return {
    padding: "14px 32px", fontFamily: "'Narrows Sans', system-ui, sans-serif", fontSize: 18, fontWeight: 700,
    letterSpacing: 2, cursor: loaded ? "pointer" : "wait", borderRadius: 10, border: "none",
    color: !loaded ? "#888" : primary ? "#1a1304" : "#e9e8df",
    background: !loaded ? "#3a3a44" : primary ? "#d2b782" : "rgba(30,52,61,.9)",
  };
}
