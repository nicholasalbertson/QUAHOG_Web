/**
 * §1.9.8 Visual deformation capped per quality tier.
 */

import type { Quality } from "../quality";

export interface DeformBudget {
  maxPanels: number;
  morphStrength: number;
  particles: boolean;
}

export function deformBudget(q: Quality): DeformBudget {
  if (q <= 0) return { maxPanels: 2, morphStrength: 0.25, particles: false };
  if (q === 1) return { maxPanels: 4, morphStrength: 0.55, particles: true };
  return { maxPanels: 8, morphStrength: 1, particles: true };
}

export function clampDeform(amount: number, q: Quality): number {
  return Math.min(amount, deformBudget(q).morphStrength);
}
