/**
 * §2.6.3 Night headlights: emissive + spotlight, budgeted per tier.
 */

export interface HeadlightBudget {
  maxSpotlights: number;
  emissiveOnlyBeyond: number;
}

export function headlightBudget(quality: 0 | 1 | 2): HeadlightBudget {
  if (quality === 0) return { maxSpotlights: 2, emissiveOnlyBeyond: 40 };
  if (quality === 1) return { maxSpotlights: 4, emissiveOnlyBeyond: 70 };
  return { maxSpotlights: 8, emissiveOnlyBeyond: 100 };
}

export function useSpotlight(distance: number, budget: HeadlightBudget, index: number): boolean {
  return index < budget.maxSpotlights && distance <= budget.emissiveOnlyBeyond;
}
