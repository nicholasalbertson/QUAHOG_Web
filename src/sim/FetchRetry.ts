/**
 * §2.1.5 Tile/asset fetch retry with backoff + circuit breaker.
 */

export interface FetchRetryOpts {
  maxAttempts?: number;
  baseMs?: number;
  maxMs?: number;
  /** Failures before open circuit. */
  tripAfter?: number;
  /** Open-circuit cool-down ms. */
  coolMs?: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

export type CircuitState = "closed" | "open" | "half";

export class FetchCircuit {
  private failures = 0;
  private openedAt = 0;
  private state: CircuitState = "closed";
  private readonly tripAfter: number;
  private readonly coolMs: number;
  private readonly now: () => number;
  private readonly fetchImpl: typeof fetch;
  private readonly maxAttempts: number;
  private readonly baseMs: number;
  private readonly maxMs: number;

  constructor(opts: FetchRetryOpts = {}) {
    this.tripAfter = opts.tripAfter ?? 5;
    this.coolMs = opts.coolMs ?? 10_000;
    this.now = opts.now ?? (() => Date.now());
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.baseMs = opts.baseMs ?? 200;
    this.maxMs = opts.maxMs ?? 4000;
  }

  get circuit(): CircuitState {
    this.refresh();
    return this.state;
  }

  private refresh(): void {
    if (this.state === "open" && this.now() - this.openedAt >= this.coolMs) {
      this.state = "half";
    }
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    this.refresh();
    if (this.state === "open") {
      throw new Error("fetch circuit open");
    }
    let lastErr: unknown;
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const res = await this.fetchImpl(input, init);
        if (res.ok || res.status < 500) {
          this.onSuccess();
          return res;
        }
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (e) {
        lastErr = e;
      }
      if (attempt + 1 < this.maxAttempts) {
        const delay = Math.min(this.maxMs, this.baseMs * 2 ** attempt);
        await sleep(delay);
      }
    }
    this.onFailure();
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.tripAfter || this.state === "half") {
      this.state = "open";
      this.openedAt = this.now();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
