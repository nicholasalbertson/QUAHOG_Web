import { afterEach, describe, expect, it, vi } from "vitest";
import {
  persistSummary,
  readSoakSummary,
  soakActive,
  soakSnapshot,
  soakUrlEnabled,
  SOAK_STORAGE_KEY,
  startSoak,
  tickSoak,
} from "../../sim/SoakHarness";

describe("SoakHarness", () => {
  afterEach(() => {
    try {
      localStorage.removeItem(SOAK_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  });

  it("reads soak=1 from the URL", () => {
    const prev = globalThis.location;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: new URL("http://localhost/?debug&soak=1&perf=1"),
    });
    expect(soakUrlEnabled()).toBe(true);
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: prev,
    });
  });

  it("samples streamer metrics on the first tick after start", () => {
    startSoak(1_000);
    expect(soakActive()).toBe(true);
    const sample = tickSoak(1_000);
    expect(sample).not.toBeNull();
    expect(sample!.tSec).toBe(0);
    expect(soakSnapshot().samples.length).toBe(1);
    // Within the 5-minute window, no second sample.
    expect(tickSoak(1_000 + 60_000)).toBeNull();
  });

  it("writes a JSON summary to localStorage mounthope.soak.v1", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
    startSoak(2_000);
    tickSoak(2_000);
    const summary = persistSummary(99);
    expect(summary).not.toBeNull();
    expect(store[SOAK_STORAGE_KEY]).toBeTruthy();
    const parsed = readSoakSummary();
    expect(parsed?.samples.length).toBe(1);
    expect(parsed?.updatedAt).toBe(99);
    expect(typeof parsed?.peakResidentBytes).toBe("number");
    vi.unstubAllGlobals();
  });
});
