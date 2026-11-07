import { afterEach, describe, expect, it } from "vitest";
import {
  soakActive,
  soakSnapshot,
  soakUrlEnabled,
  startSoak,
  tickSoak,
} from "../../sim/SoakHarness";

describe("SoakHarness", () => {
  afterEach(() => {
    // Reset by starting fresh state via private snapshot mutation is not exposed;
    // startSoak re-arms cleanly for subsequent samples.
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
});
