import { useEffect, useState } from "react";
import { useGame } from "../store";
import { useStats } from "../game";
import { useMission } from "../mission";
import { useEconomy } from "../economy";
import { useInventory } from "../inventory";
import { sfx } from "../audio/sfx";
import { clearAllSaves } from "../sim/SaveGame";
import { getItem } from "../storage";
import { worldJournal } from "../world/worldJournal";
import { t, tf, STRINGS } from "../i18n/strings";

// A save exists if EITHER the stats key or the position key is present.
// (2026-11-07, streamer-stability diagnosis Q3.) The old gate required the
// stats key alone; a short session killed before the first autosave (the old
// autosave ran on capped sim dt, so it could take ~80 wall-seconds on a
// struggling phone) left no stats key and the menu reported "Continue
// unavailable · missing stats" even though the position key existed. The
// restore tolerates a missing stats key (load() coerces to defaults), so a
// pos-only save still continues — at the saved position, with default stats.
const hasSave = () => !!getItem("mounthope.save.v1") || !!getItem("mounthope.pos.v1");

// Title / start screen (§22). Shown over the loading world until the player
// presses Play; doubles as the first user gesture that unlocks audio.
// Tips live in the §16.1 string catalog (src/i18n/strings.ts, menu.tips).

export function StartMenu({ sliceName, progress = 0 }: { sliceName: string; progress?: number }) {
  const started = useGame((s) => s.started);
  const [tip] = useState(() => STRINGS.menu.tips[Math.floor(Math.random() * STRINGS.menu.tips.length)]);
  const [save, setSave] = useState(hasSave);
  // The menu is always mounted and returns null while playing, so the
  // useState initializer above runs ONCE at app mount. Re-check the gate
  // every time the menu becomes visible (quit-to-title mid-session, or a
  // reload) — otherwise the Continue button can be stale relative to saves
  // written since mount.
  useEffect(() => {
    if (!started) setSave(hasSave());
  }, [started]);
  const loaded = sliceName !== "loading…";
  if (started) return null;
  const pct = Math.round(progress * 100);

  const play = () => { sfx.setVolume(0.5); useGame.getState().setStarted(true); };
  const newGame = () => {
    clearAllSaves();
    useStats.getState().reset();
    useMission.getState().reset();
    useEconomy.setState({ owned: {} });
    useInventory.getState().reset();
    worldJournal.reset(); // a new life has its own event history
    useGame.getState().resetSession(); // clear bat/photo/waypoint/scrimshaw & remount per-game props
    play();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 30, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      background: "radial-gradient(ellipse at 50% 40%, rgba(31,54,62,.66), rgba(9,24,31,.96))",
      fontFamily: "'Narrows Sans', system-ui, sans-serif", color: "#e9e8df",
    }}>
      <div style={{ fontSize: 13, letterSpacing: 8, color: "#d2b782", opacity: 0.9 }}>{t("menu", "eyebrow")}</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(34px, 7vw, 76px)", fontWeight: 900, letterSpacing: 6, color: "#fff", textShadow: "0 4px 25px rgba(0,0,0,.3)", lineHeight: 1 }}>
        {t("menu", "title")}
      </div>
      <div style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>{t("menu", "subtitle")}</div>

      <div style={{ marginTop: 34, display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: "92vw", gap: 14 }}>
        {save && (
          <button disabled={!loaded} onClick={play} style={btn(loaded, true)}>{loaded ? t("common", "continue") : t("common", "loading")}</button>
        )}
        <button disabled={!loaded} onClick={newGame} style={btn(loaded, !save)}>
          {loaded ? (save ? t("common", "newGameSave") : t("common", "newGame")) : t("common", "loading")}
        </button>
      </div>

      {!save && (
        <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6 }}>{t("menu", "continueUnavailable")}</div>
      )}

      {!loaded && (
        <div style={{ marginTop: 22, width: 280 }}>
          <div style={{ height: 6, borderRadius: 4, background: "rgba(120,110,150,.25)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#b6c5c3", transition: "width .2s ease" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, letterSpacing: 1 }}>{t("menu", "loadingDistrict")} · {pct}%</div>
        </div>
      )}

      <a href="earth.html" style={{
        marginTop: 18, textDecoration: "none", pointerEvents: "auto",
        padding: "9px 20px", borderRadius: 8, border: "1px solid #2c6a8e",
        background: "rgba(20,40,60,.7)", color: "#9fe0ff", fontFamily: "'Narrows Sans', system-ui, sans-serif",
        fontSize: 13, fontWeight: 700, letterSpacing: 1,
      }}>
        {t("menu", "photoreal")}
      </a>

      <div style={{ marginTop: 22, fontSize: 12, opacity: 0.6, maxWidth: 420 }}>{tf(t("menu", "tip"), { tip })}</div>
      <div style={{ position: "absolute", bottom: 12, fontSize: 10, opacity: 0.5 }}>
        {t("menu", "footer")}
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
