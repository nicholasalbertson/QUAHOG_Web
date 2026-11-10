// Title, pause, settings, and control rebinding for the photoreal build.
// The key map is the shared one (src/sim/KeyRemap.ts), so a bind made here
// is the bind the stylized build reads too.

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BUSINESSES, useEconomy } from "../economy";
import { useStats } from "../game";
import { sfx } from "../audio/sfx";
import { shared } from "../shared";
import { sim } from "../sim/SimRuntime";
import type { RemappableAction } from "../sim/KeyRemap";
import type { Weather } from "./Ambient";
import {
  ACTION_LABELS,
  actionCode,
  currentMap,
  loadSettings,
  rebind,
  saveSettings,
  type EarthSettings,
  type QualityChoice,
} from "./controls";
import { REGION_JOBS, currentJob, currentLine, frontCost, isJobDone, jobSnapshot, jobUnlocked, startJob, unlockedFrontIds } from "./jobs";
import { listAchievements } from "./achievements";
import { SLOT_COUNT, SLOT_KEY, parseSlots, type SlotFile } from "./slots";
import { loadJSON, saveJSON } from "../storage";
import { playState } from "./playState";

const RESERVED = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const panel: CSSProperties = {
  pointerEvents: "auto",
  background: "#0c1018",
  border: "1px solid #2c3a5e",
  borderRadius: 12,
  padding: "22px 24px",
  color: "#e7e0ff",
  font: "14px/1.5 'Courier New', monospace",
  maxWidth: 460,
  width: "min(460px, calc(100vw - 32px))",
};

const button: CSSProperties = {
  pointerEvents: "auto",
  cursor: "pointer",
  border: "1px solid #2c3a5e",
  background: "rgba(5,7,13,.8)",
  color: "#e7e0ff",
  font: "13px 'Courier New', monospace",
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
};

function scrim(children: ReactNode) {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(2,4,10,.55)", zIndex: 32, pointerEvents: "auto" }}>
      {children}
    </div>
  );
}

function prettyKey(code: string): string {
  if (code === "Space") return "Space";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Escape") return "Esc";
  return code.replace(/^Key/, "").replace(/^Digit/, "");
}

function setHour(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  shared.hour = h;
  sim.clock.hour = h;
}

export function TitleScreen({ canContinue, onContinue, onNew, onSettings }: {
  canContinue: boolean;
  onContinue: () => void;
  onNew: () => void;
  onSettings?: (settings: EarthSettings) => void;
}) {
  const [settings, setSettings] = useState(false);
  return scrim(
    <div style={panel}>
      <div style={{ color: "#7ad9ff", fontSize: 22, letterSpacing: 2 }}>THE NARROWS</div>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>South Coast — Fall River, New Bedford, Brockton, Cape Cod</div>
      {settings ? (
        <SettingsBody onBack={() => setSettings(false)} onChange={onSettings} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {canContinue && <button style={button} onClick={onContinue}>Continue</button>}
          <button style={button} onClick={onNew}>{canContinue ? "New drive" : "Drive"}</button>
          <a href="./index.html" style={{ ...button, textAlign: "center", textDecoration: "none" }}>Street map</a>
          <button style={button} onClick={() => setSettings(true)}>Settings</button>
          <div style={{ opacity: 0.55, fontSize: 11, marginTop: 8 }}>
            WASD to move. The car is parked beside you. M is the map.
          </div>
        </div>
      )}
    </div>,
  );
}

export function PauseScreen({ onResume, onMap, onTitle, onSave, weather, setWeather, onSettings }: {
  onResume: () => void;
  onMap: () => void;
  onTitle: () => void;
  onSave: () => void;
  weather: Weather;
  setWeather: (w: Weather) => void;
  onSettings?: (settings: EarthSettings) => void;
}) {
  const [page, setPage] = useState<"main" | "settings" | "controls" | "fronts" | "jobs" | "credits" | "saves" | "stats">("main");
  const [hour, setHourState] = useState(shared.hour);
  return scrim(
    <div style={panel}>
      <div style={{ color: "#7ad9ff", marginBottom: 10 }}><b>PAUSED</b></div>
      {page === "main" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={button} onClick={onResume}>Resume</button>
          <button style={button} onClick={onMap}>Map</button>
          <button style={button} onClick={() => setPage("fronts")}>Fronts</button>
          <button style={button} onClick={() => setPage("jobs")}>Story</button>
          <button style={button} onClick={() => setPage("saves")}>Saves</button>
          <button style={button} onClick={() => setPage("stats")}>Stats</button>
          <button style={button} onClick={() => setPage("controls")}>Controls</button>
          <button style={button} onClick={() => setPage("settings")}>Settings</button>
          <button style={button} onClick={() => setPage("credits")}>Credits</button>
          <button style={button} onClick={onSave}>Save</button>
          <button style={button} onClick={onTitle}>Title</button>
        </div>
      )}
      {page === "settings" && (
        <SettingsBody
          weather={weather}
          setWeather={setWeather}
          hour={hour}
          onHour={(h) => { setHour(h); setHourState(h); }}
          onBack={() => setPage("main")}
          onChange={onSettings}
        />
      )}
      {page === "controls" && <ControlsBody onBack={() => setPage("main")} />}
      {page === "fronts" && <FrontsBody onBack={() => setPage("main")} />}
      {page === "jobs" && <JobsBody onBack={() => setPage("main")} />}
      {page === "saves" && <SavesBody onBack={() => setPage("main")} />}
      {page === "stats" && <StatsBody onBack={() => setPage("main")} />}
      {page === "credits" && <CreditsBody onBack={() => setPage("main")} />}
    </div>,
  );
}

function SettingsBody({ onBack, weather, setWeather, hour, onHour, onChange }: {
  onBack: () => void;
  weather?: Weather;
  setWeather?: (w: Weather) => void;
  hour?: number;
  onHour?: (h: number) => void;
  onChange?: (settings: EarthSettings) => void;
}) {
  const [settings, setSettings] = useState(loadSettings);
  const write = (next: EarthSettings) => {
    setSettings(next);
    saveSettings(next);
    onChange?.(next);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label>
        Volume
        <input
          type="range" min={0} max={1} step={0.05} value={settings.volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            sfx.setVolume(v);
            write({ ...settings, volume: v });
          }}
          style={{ width: "100%", pointerEvents: "auto" }}
        />
      </label>
      <label>
        Graphics
        <select
          value={settings.quality}
          onChange={(e) => write({ ...settings, quality: e.target.value as QualityChoice })}
          style={{ display: "block", width: "100%", marginTop: 4, background: "#0c0f1a", color: "#e7e0ff", border: "1px solid #2c3a5e", borderRadius: 6, padding: 6 }}
        >
          <option value="auto">Auto</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label>
        Subtitle size
        <select
          value={String(settings.subtitleScale)}
          onChange={(e) => write({ ...settings, subtitleScale: Number(e.target.value) })}
          style={{ display: "block", width: "100%", marginTop: 4, background: "#0c0f1a", color: "#e7e0ff", border: "1px solid #2c3a5e", borderRadius: 6, padding: 6 }}
        >
          <option value="1">100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
        </select>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={settings.colorblind} onChange={(e) => write({ ...settings, colorblind: e.target.checked })} />
        Colorblind HUD (words, not only color)
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={settings.showPerf} onChange={(e) => write({ ...settings, showPerf: e.target.checked })} />
        Performance line (F3)
      </label>
      {onHour && (
        <label>
          Hour {String(Math.floor(hour ?? 0)).padStart(2, "0")}:00
          <input
            type="range" min={0} max={24} step={0.25} value={hour}
            onChange={(e) => onHour(Number(e.target.value))}
            style={{ width: "100%", pointerEvents: "auto" }}
          />
        </label>
      )}
      {setWeather && (
        <label>
          Weather
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value as Weather)}
            style={{ display: "block", width: "100%", marginTop: 4, background: "#0c0f1a", color: "#e7e0ff", border: "1px solid #2c3a5e", borderRadius: 6, padding: 6 }}
          >
            <option value="clear">Clear</option>
            <option value="cloudy">Cloudy</option>
            <option value="rain">Rain</option>
          </select>
        </label>
      )}
      <button style={button} onClick={onBack}>Back</button>
    </div>
  );
}

function JobsBody({ onBack }: { onBack: () => void }) {
  const [rev, setRev] = useState(0);
  const active = currentJob();
  const spoken = currentLine();
  return (
    <div id="story-screen" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        {active
          ? `${active.job.who} — ${active.job.title}. ${active.step.kind ?? "go"}: ${active.step.text}`
          : "One chapter at a time. Fall River opens the story. A failed timer returns you to the last checkpoint."}
      </div>
      {spoken && <div style={{ fontSize: 12, color: "#ffcf4a" }}>{spoken.who}: {spoken.text}</div>}
      {REGION_JOBS.map((job) => {
        const finished = isJobDone(job.id);
        const open = jobUnlocked(job.id);
        return (
          <button
            key={job.id}
            style={{ ...button, opacity: finished || !open || (active && active.job.id !== job.id) ? 0.45 : 1 }}
            disabled={finished || !open || !!active}
            onClick={() => { if (startJob(job.id)) setRev(rev + 1); }}
          >
            {job.regionLabel}: {job.title}{finished ? " — done" : open ? "" : " — locked"}
          </button>
        );
      })}
      <button style={button} onClick={onBack}>Back</button>
    </div>
  );
}

function readSlots(): SlotFile {
  return parseSlots(loadJSON(SLOT_KEY, null));
}

function SavesBody({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState(readSlots);
  const useSlot = (index: number) => {
    const next = parseSlots({ active: index, slots: file.slots });
    saveJSON(SLOT_KEY, next);
    setFile(next);
  };
  return (
    <div id="saves-screen" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Autosave writes the active slot. Continue on the title loads that slot.
      </div>
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const slot = file.slots[i];
        return (
          <button key={i} style={{ ...button, borderColor: file.active === i ? "#7ad9ff" : "#2c3a5e" }} onClick={() => useSlot(i)}>
            Slot {i + 1}{file.active === i ? " — active" : ""}{slot ? ` — ${slot.placeId}` : " — empty"}
          </button>
        );
      })}
      <button style={button} onClick={onBack}>Back</button>
    </div>
  );
}

function StatsBody({ onBack }: { onBack: () => void }) {
  const owned = useEconomy((s) => s.owned);
  const cash = useStats((s) => s.cash);
  const input = {
    career: playState.career,
    jobsDone: jobSnapshot().jobsDone,
    ownedFronts: Object.keys(owned).length,
    heatSeen: playState.heatSeen,
  };
  const rows = listAchievements(input);
  const earned = rows.filter((row) => row.earned).length;
  return (
    <div id="stats-screen" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
      <div>Cash ${Math.round(cash)} · driven {(input.career.meters / 1000).toFixed(1)} km · repairs {input.career.repairs}</div>
      <div style={{ opacity: 0.7 }}>{earned} / {rows.length} achievements</div>
      <div style={{ maxHeight: 240, overflow: "auto" }}>
        {rows.map((row) => (
          <div key={row.id} style={{ opacity: row.earned ? 1 : 0.45, marginBottom: 4 }}>
            {row.earned ? "●" : "○"} {row.name} — {row.detail}
          </div>
        ))}
      </div>
      <button style={button} onClick={onBack}>Back</button>
    </div>
  );
}

function CreditsBody({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
      <div>The Narrows is a driving game on the real South Coast of Massachusetts.</div>
      <div>Streets and place names: © OpenStreetMap contributors, under the Open Database License.</div>
      <div>Photoreal buildings and ground: Google Photorealistic 3D Tiles. Imagery © Google, under the Map Tiles API terms.</div>
      <div>Cars are GLB models in /packs. Confirm that pack's license before a store build. This screen does not grant one.</div>
      <div>People are placeholder figures drawn by the game.</div>
      <div>Sound is generated in the browser. No music files ship in this repo.</div>
      <button style={button} onClick={onBack}>Back</button>
    </div>
  );
}

function ControlsBody({ onBack }: { onBack: () => void }) {
  const [map, setMap] = useState(currentMap());
  const [listen, setListen] = useState<RemappableAction | null>(null);
  useEffect(() => {
    if (!listen) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") { setListen(null); return; }
      if (RESERVED.has(e.code)) return;
      setMap(rebind(listen, e.code));
      setListen(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listen]);
  const actions = Object.keys(ACTION_LABELS) as RemappableAction[];
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        {listen ? `Press a key for ${ACTION_LABELS[listen]}` : "Click a bind, then press a key. WASD stays for driving."}
      </div>
      {actions.map((action) => (
        <div key={action} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
          <span>{ACTION_LABELS[action]}</span>
          <button style={{ ...button, padding: "3px 8px" }} onClick={() => setListen(action)}>
            {prettyKey(map[action] ?? actionCode(action))}
          </button>
        </div>
      ))}
      <div style={{ opacity: 0.6, fontSize: 11, margin: "6px 0" }}>
        Punch is F. A gamepad uses the right trigger to accelerate, the left trigger to brake, Start to pause, A to enter, B to brake, X to punch, and Y for the camera.
      </div>
      <button style={button} onClick={onBack}>Back</button>
    </div>
  );
}

function FrontsBody({ onBack }: { onBack: () => void }) {
  const owned = useEconomy((s) => s.owned);
  const cash = useStats((s) => s.cash);
  const unlocked = unlockedFrontIds();
  const buy = (id: string) => {
    const business = BUSINESSES.find((b) => b.id === id);
    const price = business ? frontCost(business.id, business.cost, unlocked) : 0;
    if (!business || owned[id] || cash < price) return;
    useStats.getState().addCash(-price);
    useEconomy.getState().buy(business);
    useEconomy.getState().save();
    useStats.getState().save();
    sfx.cash();
  };
  return (
    <div>
      <div style={{ marginBottom: 8 }}>Cash ${Math.round(cash)}. Owned fronts pay every in-game day.</div>
      <div style={{ maxHeight: 280, overflow: "auto" }}>
        {BUSINESSES.map((b) => (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, fontSize: 12 }}>
            <span>{b.name}<span style={{ opacity: 0.6 }}> · {b.blurb} · ${b.perDay}/day</span></span>
            {owned[b.id]
              ? <span style={{ color: "#7CFC00" }}>owned</span>
              : <button style={{ ...button, padding: "3px 8px" }} disabled={cash < frontCost(b.id, b.cost, unlocked)} onClick={() => buy(b.id)}>${frontCost(b.id, b.cost, unlocked)}</button>}
          </div>
        ))}
      </div>
      <button style={{ ...button, marginTop: 8 }} onClick={onBack}>Back</button>
    </div>
  );
}

const HINT_KEY = "mh.earth.hint.v1";

export function DriveHint() {
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem(HINT_KEY) !== "1"; } catch { return true; }
  });
  if (!show) return null;
  const dismiss = () => {
    try { localStorage.setItem(HINT_KEY, "1"); } catch { /* private mode */ }
    setShow(false);
  };
  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 15, pointerEvents: "auto" }}>
      <div style={{ ...panel, padding: "12px 14px", maxWidth: 320 }}>
        <b style={{ color: "#7ad9ff" }}>How to drive</b>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          WASD walk. E gets in the car. Space brakes. Shift runs. F punches. H horn. M map. Esc pauses.
        </div>
        <button style={{ ...button, marginTop: 8 }} onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}
