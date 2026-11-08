/**
 * §1.11 Telemetry overlay — percentile ring buffers + dump.
 */

export class PercentileRing {
  private buf: Float64Array;
  private i = 0;
  private n = 0;
  constructor(capacity = 600) {
    this.buf = new Float64Array(capacity);
  }

  push(v: number): void {
    this.buf[this.i] = v;
    this.i = (this.i + 1) % this.buf.length;
    this.n = Math.min(this.n + 1, this.buf.length);
  }

  percentile(p: number): number {
    if (this.n === 0) return 0;
    const slice = Array.from(this.buf.subarray(0, this.n)).sort((a, b) => a - b);
    const idx = Math.min(slice.length - 1, Math.max(0, Math.floor((p / 100) * (slice.length - 1))));
    return slice[idx];
  }

  get count(): number {
    return this.n;
  }
}

export interface PerfSnapshot {
  frame: { p50: number; p95: number; p99: number };
  sim: { p50: number; p95: number; p99: number };
  entities: { peds: number; vehicles: number; boats: number; mission: number; resident: number };
  streamer: { queue: number; resident: number; evict: number; loadMs: number; fails: number };
  alarm: boolean;
}

export class PerfOverlay {
  readonly frame = new PercentileRing();
  readonly sim = new PercentileRing();
  visible = false;
  private alarmFrames = 0;
  entities = { peds: 0, vehicles: 0, boats: 0, mission: 0, resident: 0 };
  streamer = { queue: 0, resident: 0, evict: 0, loadMs: 0, fails: 0 };
  private history: PerfSnapshot[] = [];

  sample(frameMs: number, simMs: number): PerfSnapshot {
    this.frame.push(frameMs);
    this.sim.push(simMs);
    if (this.frame.percentile(95) > 33) this.alarmFrames++;
    else this.alarmFrames = 0;
    const snap: PerfSnapshot = {
      frame: {
        p50: this.frame.percentile(50),
        p95: this.frame.percentile(95),
        p99: this.frame.percentile(99),
      },
      sim: {
        p50: this.sim.percentile(50),
        p95: this.sim.percentile(95),
        p99: this.sim.percentile(99),
      },
      entities: { ...this.entities },
      streamer: { ...this.streamer },
      alarm: this.alarmFrames > 90,
    };
    this.history.push(snap);
    if (this.history.length > 3600) this.history.shift();
    return snap;
  }

  dumpJson(): string {
    return JSON.stringify({
      recent: this.history.slice(-360),
      now: this.history.length ? this.history[this.history.length - 1] : null,
    });
  }

  /** Dev cost estimate — ring push only. */
  costMs(): number {
    return this.visible ? 0.2 : 0;
  }
}

export const perfOverlay = new PerfOverlay();
