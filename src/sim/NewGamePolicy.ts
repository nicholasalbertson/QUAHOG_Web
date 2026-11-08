/**
 * §11.4.4 Clear race best / settings policy on New Game.
 */

export interface NewGamePolicy {
  clearRaceBests: boolean;
  clearSettings: boolean;
  clearSlots: boolean;
}

export const DEFAULT_NEW_GAME: NewGamePolicy = {
  clearRaceBests: true,
  clearSettings: false, // keep accessibility / audio prefs
  clearSlots: true,
};

export function applyNewGame(
  policy: NewGamePolicy,
  store: { removeItem(k: string): void },
  keys: { raceBests: string; settings: string; slots: string[] },
): string[] {
  const cleared: string[] = [];
  if (policy.clearRaceBests) {
    store.removeItem(keys.raceBests);
    cleared.push(keys.raceBests);
  }
  if (policy.clearSettings) {
    store.removeItem(keys.settings);
    cleared.push(keys.settings);
  }
  if (policy.clearSlots) {
    for (const s of keys.slots) {
      store.removeItem(s);
      cleared.push(s);
    }
  }
  return cleared;
}
