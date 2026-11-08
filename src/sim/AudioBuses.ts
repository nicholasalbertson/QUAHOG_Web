/**
 * §10.6.1 Audio buses (master/music/sfx/radio).
 */

export type AudioBusId = "master" | "music" | "sfx" | "radio";

export interface AudioBusState {
  master: number;
  music: number;
  sfx: number;
  radio: number;
  muted: boolean;
}

const KEY = "quahog.audioBuses.v1";

export function defaultBuses(): AudioBusState {
  return { master: 1, music: 0.7, sfx: 1, radio: 0.85, muted: false };
}

export function loadBuses(storage: Storage = localStorage): AudioBusState {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return defaultBuses();
    return { ...defaultBuses(), ...(JSON.parse(raw) as Partial<AudioBusState>) };
  } catch {
    return defaultBuses();
  }
}

export function saveBuses(state: AudioBusState, storage: Storage = localStorage): void {
  storage.setItem(KEY, JSON.stringify(state));
}

export function setBus(state: AudioBusState, id: AudioBusId, value: number): AudioBusState {
  const v = Math.max(0, Math.min(1, value));
  return { ...state, [id]: v };
}

/** Effective gain for a bus after master + mute. */
export function effectiveGain(state: AudioBusState, id: Exclude<AudioBusId, "master">): number {
  if (state.muted) return 0;
  return state.master * state[id];
}
