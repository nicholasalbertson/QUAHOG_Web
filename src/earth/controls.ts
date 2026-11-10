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

export interface EarthSettings {
  volume: number;
}

export function loadSettings(): EarthSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { volume: 0.5 };
    const rec = JSON.parse(raw) as Partial<EarthSettings>;
    const volume = typeof rec.volume === "number" && Number.isFinite(rec.volume) ? rec.volume : 0.5;
    return { volume: Math.max(0, Math.min(1, volume)) };
  } catch {
    return { volume: 0.5 };
  }
}

export function saveSettings(settings: EarthSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}
