/**
 * §4.5.1 Day-based payout summary model (HUD binds later).
 */

import { BUSINESSES, useEconomy } from "../economy";

export interface DayPayoutLine {
  id: string;
  name: string;
  amount: number;
}

export interface DayPayoutSummary {
  day: number;
  lines: DayPayoutLine[];
  total: number;
}

export function buildDayPayout(day: number): DayPayoutSummary {
  const { owned, tiers, employees } = useEconomy.getState();
  const lines: DayPayoutLine[] = [];
  let total = 0;
  for (const b of BUSINESSES) {
    if (!owned[b.id]) continue;
    const tierMul = [1, 1.25, 1.55, 2][tiers[b.id] ?? 0] ?? 1;
    const staff = employees[b.id] ?? 0;
    const amount = Math.round(b.perDay * tierMul * (1 + staff * 0.08));
    lines.push({ id: b.id, name: b.name, amount });
    total += amount;
  }
  return { day, lines, total };
}
