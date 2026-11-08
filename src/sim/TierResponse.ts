/**
 * §3.2.9 Each tier produces documented response within 10s (logic).
 */

import { heatTier, desiredCops } from "./HeatTiers";

export interface TierResponse {
  tier: number;
  cruisers: number;
  heli: boolean;
  roadblocks: boolean;
  pit: boolean;
  withinSec: number;
  label: string;
}

export function responseForWanted(wanted: number): TierResponse {
  const t = heatTier(wanted);
  return {
    tier: t.stars,
    cruisers: desiredCops(wanted),
    heli: t.helicopter,
    roadblocks: t.roadblocks,
    pit: t.pit,
    withinSec: 10,
    label: t.label,
  };
}

/** Simulated response clock — true once elapsed >= withinSec. */
export function responseReady(resp: TierResponse, elapsedSec: number): boolean {
  return elapsedSec >= resp.withinSec;
}
