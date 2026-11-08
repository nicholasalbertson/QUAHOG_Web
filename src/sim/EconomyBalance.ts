/**
 * §4.5.2 Balance pass targets — time-to-first-upgrade / wealth.
 */

export interface BalanceTargets {
  /** Simulated minutes of play to first business unlock. */
  firstUpgradeMin: number;
  /** Simulated minutes to "comfortable" cash (≥ threshold). */
  wealthMin: number;
  wealthCash: number;
}

export const BALANCE_TARGETS: BalanceTargets = {
  firstUpgradeMin: 20,
  wealthMin: 90,
  wealthCash: 5000,
};

/** Rough projection from hourly income + starting cash. */
export function projectedFirstUpgradeMin(
  startCash: number,
  incomePerHour: number,
  upgradeCost: number,
): number {
  if (startCash >= upgradeCost) return 0;
  if (incomePerHour <= 0) return Infinity;
  const need = upgradeCost - startCash;
  return (need / incomePerHour) * 60;
}

export function meetsFirstUpgradeGate(projMin: number, targets = BALANCE_TARGETS): boolean {
  return projMin <= targets.firstUpgradeMin;
}
