/**
 * §4.2.4 Ownership management UI model.
 */

export interface OwnershipRow {
  id: string;
  name: string;
  owned: boolean;
  incomePerDay: number;
  status: "for-sale" | "owned" | "locked";
}

export function ownershipRows(
  fronts: { id: string; name: string; cost: number }[],
  owned: Iterable<string>,
  income: Record<string, number> = {},
): OwnershipRow[] {
  const set = new Set(owned);
  return fronts.map((f) => {
    const isOwned = set.has(f.id);
    return {
      id: f.id,
      name: f.name,
      owned: isOwned,
      incomePerDay: income[f.id] ?? (isOwned ? Math.round(f.cost * 0.04) : 0),
      status: isOwned ? "owned" : "for-sale",
    };
  });
}
