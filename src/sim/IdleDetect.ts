/**
 * §2.2.2 Idle detection (no input N s) → suggest 15fps or pause.
 */

export type IdleAction = "none" | "throttle" | "pause";

export interface IdleDetectOpts {
  /** Seconds without input before throttle. */
  throttleAfterSec?: number;
  /** Seconds without input before pause suggestion. */
  pauseAfterSec?: number;
  now?: () => number;
}

export class IdleDetect {
  private lastInputMs: number;
  private readonly throttleAfterMs: number;
  private readonly pauseAfterMs: number;
  private readonly now: () => number;

  constructor(opts: IdleDetectOpts = {}) {
    this.now = opts.now ?? (() => performance.now());
    this.lastInputMs = this.now();
    this.throttleAfterMs = (opts.throttleAfterSec ?? 45) * 1000;
    this.pauseAfterMs = (opts.pauseAfterSec ?? 180) * 1000;
  }

  poke(): void {
    this.lastInputMs = this.now();
  }

  idleSec(): number {
    return (this.now() - this.lastInputMs) / 1000;
  }

  action(): IdleAction {
    const idle = this.now() - this.lastInputMs;
    if (idle >= this.pauseAfterMs) return "pause";
    if (idle >= this.throttleAfterMs) return "throttle";
    return "none";
  }

  /** Target fps hint: 60 active, 15 throttle, 0 pause. */
  targetFps(): number {
    const a = this.action();
    if (a === "pause") return 0;
    if (a === "throttle") return 15;
    return 60;
  }
}
