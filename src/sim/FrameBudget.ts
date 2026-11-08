/**
 * Frame-time budget helper for discretionary sim work (streaming, ambient AI).
 * Essential gameplay continues; low-priority systems shrink under load.
 * Tuned for iPhone-class WebGL budgets (~16.6 ms @ 60 Hz, ~33 ms @ 30 Hz).
 */

export interface FrameBudgetOptions {
  /** Target frame period in ms (default 16.6 ≈ 60 Hz). */
  targetMs?: number;
  /** Reserve for render + physics before discretionary work. */
  reservedMs?: number;
}

export interface SystemCost {
  system: string;
  ms: number;
}

export class FrameBudget {
  readonly targetMs: number;
  readonly reservedMs: number;
  private frameStart = 0;
  private started = false;
  private lastFrameMs = 16.6;
  private emaMs = 16.6;
  /** §1.11.4 per-system attribution for the current frame. */
  private costs: SystemCost[] = [];
  private lastOverruns: SystemCost[] = [];

  constructor(opts: FrameBudgetOptions = {}) {
    this.targetMs = opts.targetMs ?? 16.6;
    this.reservedMs = opts.reservedMs ?? 10;
  }

  beginFrame(nowMs = performance.now()): void {
    if (this.started) {
      this.lastFrameMs = nowMs - this.frameStart;
      this.emaMs = this.emaMs * 0.85 + this.lastFrameMs * 0.15;
      if (this.lastFrameMs > this.targetMs * 1.25) {
        this.lastOverruns = this.costs.slice().sort((a, b) => b.ms - a.ms);
      }
    }
    this.frameStart = nowMs;
    this.started = true;
    this.costs = [];
  }

  /** Attribute elapsed ms to a named system (call after work completes). */
  attribute(system: string, ms: number): void {
    if (!(ms > 0) || !system) return;
    const existing = this.costs.find((c) => c.system === system);
    if (existing) existing.ms += ms;
    else this.costs.push({ system, ms });
  }

  /** Time a block and attribute it. */
  measure<T>(system: string, fn: () => T): T {
    const t0 = performance.now();
    try {
      return fn();
    } finally {
      this.attribute(system, performance.now() - t0);
    }
  }

  /** Last overrun's top systems (empty when healthy). */
  get overruns(): readonly SystemCost[] {
    return this.lastOverruns;
  }

  get attribution(): readonly SystemCost[] {
    return this.costs;
  }

  /** Measured previous-frame cost (ms). */
  get frameMs(): number {
    return this.lastFrameMs;
  }

  /** Smoothed frame cost. */
  get smoothMs(): number {
    return this.emaMs;
  }

  /** True when the device is under the target budget. */
  get healthy(): boolean {
    return this.emaMs <= this.targetMs * 1.15;
  }

  /**
   * Remaining milliseconds available for discretionary work this frame.
   * Returns 0 when the previous frame overran or reserve is exhausted.
   */
  remainingMs(nowMs = performance.now()): number {
    const elapsed = nowMs - this.frameStart;
    const headroom = this.targetMs - this.reservedMs - elapsed;
    // Shrink further when the EMA shows sustained pressure (mobile thermal).
    const pressure = clamp01((this.emaMs - this.targetMs) / this.targetMs);
    return Math.max(0, headroom * (1 - pressure * 0.85));
  }

  /** iPhone-leaning presets from a coarse quality tier. */
  static forQuality(quality: 0 | 1 | 2): FrameBudget {
    // Low: assume 30 Hz class; Medium/High: 60 Hz with tighter reserve on Low.
    if (quality === 0) return new FrameBudget({ targetMs: 33.3, reservedMs: 22 });
    if (quality === 1) return new FrameBudget({ targetMs: 16.6, reservedMs: 11 });
    return new FrameBudget({ targetMs: 16.6, reservedMs: 9 });
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
