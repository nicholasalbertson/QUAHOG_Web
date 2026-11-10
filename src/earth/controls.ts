// Earth reads the shared key map (the same one the stylized build saves).
// Gamepad buttons still emit the default codes; rebinding changes the keyboard.

import { consumeTap, isDown } from "../input";
import {
  DEFAULT_KEY_MAP,
  bindingFor,
  loadKeyMap,
  remap,
  saveKeyMap,
  type KeyMap,
  type RemappableAction,
} from "../sim/KeyRemap";

let map: KeyMap = typeof localStorage === "undefined" ? { ...DEFAULT_KEY_MAP } : loadKeyMap();

export function currentMap(): KeyMap {
  return map;
}

export function setCurrentMap(next: KeyMap): void {
  map = next;
  saveKeyMap(next);
}

export function rebind(action: RemappableAction, code: string): KeyMap {
  map = remap(map, action, code);
  saveKeyMap(map);
  return map;
}

export function actionDown(action: RemappableAction): boolean {
  return isDown(bindingFor(map, action));
}

export function actionTap(action: RemappableAction): boolean {
  return consumeTap(bindingFor(map, action));
}

export function actionCode(action: RemappableAction): string {
  return bindingFor(map, action);
}

export const ACTION_LABELS: Record<RemappableAction, string> = {
  interact: "Enter / exit",
  sprint: "Sprint",
  handbrake: "Brake / jump",
  horn: "Horn",
  camera: "Camera",
  pause: "Pause",
  map: "Map",
  weapon1: "Slot 1",
  weapon2: "Slot 2",
  weapon3: "Slot 3",
};

const SETTINGS_KEY = "mh.earth.settings.v1";

export type QualityChoice = "auto" | "high" | "medium" | "low";

export interface EarthSettings {
  volume: number;
  quality: QualityChoice;
  subtitleScale: number;
  colorblind: boolean;
  showPerf: boolean;
}

const SCALES = [1, 1.25, 1.5];

function defaultSettings(): EarthSettings {
  return { volume: 0.5, quality: "auto", subtitleScale: 1, colorblind: false, showPerf: true };
}

export function loadSettings(): EarthSettings {
  const settings = defaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return settings;
    const rec = JSON.parse(raw) as Partial<EarthSettings>;
    if (typeof rec.volume === "number" && Number.isFinite(rec.volume)) settings.volume = Math.max(0, Math.min(1, rec.volume));
    if (rec.quality === "auto" || rec.quality === "high" || rec.quality === "medium" || rec.quality === "low") settings.quality = rec.quality;
    if (typeof rec.subtitleScale === "number" && SCALES.includes(rec.subtitleScale)) settings.subtitleScale = rec.subtitleScale;
    if (typeof rec.colorblind === "boolean") settings.colorblind = rec.colorblind;
    if (typeof rec.showPerf === "boolean") settings.showPerf = rec.showPerf;
    return settings;
  } catch {
    return settings;
  }
}

export function saveSettings(settings: EarthSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}
