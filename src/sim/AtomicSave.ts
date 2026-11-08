/**
 * §1.5.T4 Atomic write: kill between tmp write and swap → old save intact.
 */

export interface AtomicStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function atomicWrite(
  store: AtomicStore,
  key: string,
  value: string,
  opts?: { killAfterTmp?: boolean },
): { ok: boolean; phase: "tmp" | "swap" | "killed" } {
  const tmp = key + ".tmp";
  store.setItem(tmp, value);
  if (opts?.killAfterTmp) {
    return { ok: false, phase: "killed" };
  }
  store.setItem(key, value);
  store.removeItem(tmp);
  return { ok: true, phase: "swap" };
}

/** Recover: if only tmp exists, do not promote; keep prior key value. */
export function atomicRecover(store: AtomicStore, key: string): string | null {
  return store.getItem(key);
}
