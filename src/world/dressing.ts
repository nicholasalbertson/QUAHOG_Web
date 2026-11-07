// Central dressing switch — full-game plan, minimalist directive (Nic,
 // 2026-11-03): dressing returns on quality ≥ Medium with density budgets.
// Experience.tsx gates mounts via dressingEnabledForQuality(quality);
// HarborProps' land-side gear boxes read the same helper.
//
// OFF on Low (quality 0). Medium / High scale prop density 0.35 / 0.65 / 1.0
// across the quality ladder (Low scale is unused while gated off).
// ALWAYS ON: roads, buildings (GIS + tiles), water, vehicles
// (player/traffic/parked), mission elements, car headlights, crosswalks,
// utility-pole visuals, traffic signals, and the debug overlay.

import type { Quality } from "../quality";

/** @deprecated Prefer dressingEnabledForQuality(quality). Kept false so legacy
 *  constant-gated call sites stay off until migrated. */
export const DRESSING_ENABLED = false;

/** True when street dressing / clutter may mount for this quality preset. */
export function dressingEnabledForQuality(q: Quality): boolean {
  return q >= 1;
}

/** Prop / clutter density multiplier for the quality ladder. */
export function dressingDensityScale(q: Quality): number {
  return ([0.35, 0.65, 1] as const)[q] ?? 0.65;
}

/** Keep every Nth item so counts track densityScale without reshuffling. */
export function scalePropCount<T>(items: T[], scale: number): T[] {
  if (scale >= 0.999) return items;
  if (scale <= 0 || items.length === 0) return [];
  const keep = Math.max(1, Math.floor(items.length * scale));
  if (keep >= items.length) return items;
  const stride = items.length / keep;
  const out: T[] = [];
  for (let i = 0; i < keep; i++) out.push(items[Math.min(items.length - 1, Math.floor(i * stride))]);
  return out;
}
