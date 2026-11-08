/**
 * §5.2.2 Cancelable reload FSM — start / cancel / interrupt.
 */

export type ReloadPhase = "idle" | "reloading";

export interface ReloadState {
  phase: ReloadPhase;
  weapon: "pistol" | "shotgun" | null;
  elapsed: number;
  duration: number;
}

export function createReload(): ReloadState {
  return { phase: "idle", weapon: null, elapsed: 0, duration: 1.1 };
}

export function startReload(
  s: ReloadState,
  weapon: "pistol" | "shotgun",
  duration = 1.1,
): boolean {
  if (s.phase === "reloading") return false;
  s.phase = "reloading";
  s.weapon = weapon;
  s.elapsed = 0;
  s.duration = duration;
  return true;
}

export function cancelReload(s: ReloadState): void {
  s.phase = "idle";
  s.weapon = null;
  s.elapsed = 0;
}

/** Sprint / damage / weapon-swap interrupt. */
export function interruptReload(s: ReloadState): void {
  if (s.phase === "reloading") cancelReload(s);
}

/** Returns true when reload completes this frame. */
export function stepReload(s: ReloadState, dt: number): boolean {
  if (s.phase !== "reloading") return false;
  s.elapsed += dt;
  if (s.elapsed >= s.duration) {
    cancelReload(s);
    return true;
  }
  return false;
}
