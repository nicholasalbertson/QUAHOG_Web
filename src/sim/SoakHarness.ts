/**
 * Opt-in long-session soak harness.
 * Enable with URL flags: `?debug&soak=1&perf=1`
 *
 * Samples streamer resident bytes + evict counts for the FPS-MATRIX soak row.
 * Does not invent FPS numbers — device measurement still required.
 * Agent soak auto-logs a JSON summary to localStorage `mounthope.soak.v1`.
 */

import { sim } from "./SimRuntime";

export const SOAK_STORAGE_KEY = "mounthope.soak.v1";

export interface SoakSample {
  tSec: number;
  residentBytes: number;
  evictCount: number;
  loadFailures: number;
}

export interface SoakSummary {
  startedAt: number;
  updatedAt: number;
  samples: SoakSample[];
  peakResidentBytes: number;
  lastEvictCount: number;
  lastLoadFailures: number;
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
  persistSummary();
}

export function soakActive(): boolean {
  return state.active;
}

/** Write the current soak summary to localStorage (best-effort). */
export function persistSummary(now = Date.now()): SoakSummary | null {
  if (typeof localStorage === "undefined") return null;
  const peak = state.samples.reduce((m, s) => Math.max(m, s.residentBytes), 0);
  const last = state.samples[state.samples.length - 1];
  const summary: SoakSummary = {
    startedAt: state.startedAt,
    updatedAt: now,
    samples: state.samples.slice(),
    peakResidentBytes: peak,
    lastEvictCount: last?.evictCount ?? 0,
    lastLoadFailures: last?.loadFailures ?? 0,
  };
  try {
    localStorage.setItem(SOAK_STORAGE_KEY, JSON.stringify(summary));
  } catch {
    /* quota / private mode */
  }
  return summary;
}

export function readSoakSummary(): SoakSummary | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SOAK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SoakSummary;
  } catch {
    return null;
  }
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
  persistSummary();
  return sample;
}

export function soakSnapshot(): Readonly<SoakState> {
  return state;
}
