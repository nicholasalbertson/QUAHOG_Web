/**
 * Opt-in long-session soak harness.
 * Enable with URL flags: `?debug&soak=1&perf=1`
 *
 * Samples streamer resident bytes + evict counts for the FPS-MATRIX soak row.
 * Does not invent FPS numbers — device measurement still required.
 */

import { sim } from "./SimRuntime";

export interface SoakSample {
  tSec: number;
  residentBytes: number;
  evictCount: number;
  loadFailures: number;
}

export interface SoakState {
  active: boolean;
  startedAt: number;
  samples: SoakSample[];
  lastLogAt: number;
}

const state: SoakState = {
  active: false,
  startedAt: 0,
  samples: [],
  lastLogAt: 0,
};

export function soakUrlEnabled(): boolean {
  if (typeof location === "undefined") return false;
  try {
    const p = new URLSearchParams(location.search);
    const soak = p.get("soak");
    return soak === "1" || soak === "true";
  } catch {
    return false;
  }
}

export function startSoak(now = performance.now()): void {
  state.active = true;
  state.startedAt = now;
  state.samples = [];
  state.lastLogAt = 0;
  console.info("[soak] started — sample every 5 min; abort on OOM or sustained <20 FPS");
}

export function soakActive(): boolean {
  return state.active;
}

export function tickSoak(now = performance.now()): SoakSample | null {
  if (!state.active) return null;
  const tSec = (now - state.startedAt) / 1000;
  if (state.lastLogAt > 0 && now - state.lastLogAt < 5 * 60 * 1000) return null;
  state.lastLogAt = now;
  const m = sim.streamer.metrics();
  const sample: SoakSample = {
    tSec,
    residentBytes: m.residentBytes,
    evictCount: m.evictCount,
    loadFailures: m.loadFailures,
  };
  state.samples.push(sample);
  console.info(
    `[soak] t=${(tSec / 60).toFixed(1)}m resident=${(sample.residentBytes / 1e6).toFixed(1)}MB evict=${sample.evictCount} fails=${sample.loadFailures}`,
  );
  return sample;
}

export function soakSnapshot(): Readonly<SoakState> {
  return state;
}
