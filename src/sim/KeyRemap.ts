/**
 * §10.3.2 Desktop remap UI + persistence.
 */

export type RemappableAction =
  | "interact"
  | "sprint"
  | "handbrake"
  | "horn"
  | "camera"
  | "pause"
  | "map"
  | "weapon1"
  | "weapon2"
  | "weapon3";

export type KeyMap = Record<RemappableAction, string>;

export const DEFAULT_KEY_MAP: KeyMap = {
  interact: "KeyE",
  sprint: "ShiftLeft",
  handbrake: "Space",
  horn: "KeyH",
  camera: "KeyV",
  pause: "Escape",
  map: "KeyM",
  weapon1: "Digit1",
  weapon2: "Digit2",
  weapon3: "Digit3",
};

const KEY = "quahog.keyMap.v1";

export function loadKeyMap(storage: Storage = localStorage): KeyMap {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { ...DEFAULT_KEY_MAP };
    return { ...DEFAULT_KEY_MAP, ...(JSON.parse(raw) as Partial<KeyMap>) };
  } catch {
    return { ...DEFAULT_KEY_MAP };
  }
}

export function saveKeyMap(map: KeyMap, storage: Storage = localStorage): void {
  storage.setItem(KEY, JSON.stringify(map));
}

export function remap(map: KeyMap, action: RemappableAction, code: string): KeyMap {
  return { ...map, [action]: code };
}

export function bindingFor(map: KeyMap, action: RemappableAction): string {
  return map[action] ?? DEFAULT_KEY_MAP[action];
}
