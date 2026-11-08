import type { Quality } from "../quality";

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
}

export function mobileBudget(q: Quality, mobile = isMobileDevice()) {
  return {
    dpr: mobile ? [1, 1, 1.25][q] : [1, 1.25, 1.5][q],
    fps: mobile ? 30 : 60,
    aerialRadius: mobile ? [1, 2, 3][q] : [2, 3, 5][q],
    aerialConcurrency: mobile ? 2 : 6,
    tileConcurrency: mobile ? 2 : 6,
    tileCache: [40, 64, 100][q],
    parkedCars: [24, 40, 60][q],
    pedestrians: [16, 28, 44][q],
    // Density cut (2026-11-07, defect 2): traffic was 6/12/20 cars spread
    // over the WHOLE district, so Nic saw ~2 cars driving. Raised ~2.5x
    // AND localized (StreetLife spawns/respawns near the player) — the cap
    // alone would still scatter cars across the city.
    traffic: [16, 28, 40][q],
    shadows: q > 0,
  };
}

// A simulation clock, independent of wall-clock suspension. Resume never feeds
// minutes of background time to Rapier, mission timers or the day/night cycle.
export class FrameClock {
  private last: number | null = null;
  private rendered: number | null = null;
  time = 0;
  next(now: number, fps: number): number | null {
    if (this.last === null) { this.last = now; this.rendered = now; return this.time; }
    if (this.rendered !== null && now - this.rendered < 1000 / fps - 0.5) return null;
    this.time += Math.min(0.05, Math.max(0, now - this.last) / 1000);
    this.last = now; this.rendered = now;
    return this.time;
  }
  suspend() { this.last = null; this.rendered = null; }
}
