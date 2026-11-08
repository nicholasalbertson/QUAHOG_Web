/**
 * §3.5.5 HUD heat decay / holding / APB chip derived from tier + zone.
 */

import { heatTier } from "./HeatTiers";

export type HeatChip = "clear" | "holding" | "decaying" | "apb" | "lose_heat";

export function heatChipState(opts: {
  stars: number;
  unseen: boolean;
  inLoseHeatZone: boolean;
}): HeatChip {
  const tier = heatTier(opts.stars);
  if (opts.stars <= 0) return "clear";
  if (tier.noDecay) return "apb";
  if (opts.inLoseHeatZone) return "lose_heat";
  if (opts.unseen) return "decaying";
  return "holding";
}

export function heatChipLabel(chip: HeatChip): string {
  switch (chip) {
    case "clear":
      return "Clear";
    case "holding":
      return "Spotted";
    case "decaying":
      return "Cooling";
    case "apb":
      return "APB";
    case "lose_heat":
      return "Lose heat";
  }
}
