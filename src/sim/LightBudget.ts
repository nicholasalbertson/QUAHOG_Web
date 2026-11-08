/**
 * §7.6.3 Light count cap per tile.
 */

export interface LightBudget {
  maxPerTile: number;
  used: number;
}

export function createLightBudget(maxPerTile = 24): LightBudget {
  return { maxPerTile, used: 0 };
}

export function tryAddLight(b: LightBudget): boolean {
  if (b.used >= b.maxPerTile) return false;
  b.used++;
  return true;
}

export function resetLightBudget(b: LightBudget): void {
  b.used = 0;
}
