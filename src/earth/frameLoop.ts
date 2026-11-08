// When to keep the photoreal canvas in a continuous rAF loop.
// Hidden tabs stop tile updates. An idle play session drops to on-demand frames
// so a settled view does not keep rasterizing, while in-flight tile events can
// still invalidate a single frame.

export const IDLE_PAUSE_MS = 8000;

export interface TileActivityInput {
  hidden: boolean;
  idleMs: number;
  /** Play mode has a surface under the player, so idling may pause the loop. */
  pauseWhenIdle: boolean;
}

export interface TileActivity {
  loop: "always" | "demand";
  tilesEnabled: boolean;
}

export function advanceIdle(idleMs: number, dtMs: number, active: boolean, capMs = 1000): number {
  if (active) return 0;
  const dt = Math.min(capMs, Math.max(0, dtMs));
  return idleMs + dt;
}

export function tileActivityFor(input: TileActivityInput): TileActivity {
  if (input.hidden) return { loop: "demand", tilesEnabled: false };
  if (input.pauseWhenIdle && input.idleMs >= IDLE_PAUSE_MS) return { loop: "demand", tilesEnabled: true };
  return { loop: "always", tilesEnabled: true };
}

// ---------------------------------------------------------------------------
// §2.1.7 Frame-time watchdog: drop a quality tier on sustained overrun.
// The component keeps a rolling window of frame times (seconds); when the
// window is full and the mean frame time stays above the overrun threshold,
// the build degrades once (lower dpr + coarser tiles) instead of melting.

export const WATCHDOG_MIN_SAMPLES = 60;
export const WATCHDOG_OVER_S = 0.033; // 33 ms mean frame = sustained overrun

export function shouldDegrade(frameTimes: number[]): boolean {
  if (frameTimes.length < WATCHDOG_MIN_SAMPLES) return false;
  const mean = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  return mean > WATCHDOG_OVER_S;
}
