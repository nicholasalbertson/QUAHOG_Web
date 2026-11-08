/**
 * §6.1.3 Multiple unlockable safehouses.
 */

export interface SafehouseDef {
  id: string;
  name: string;
  x: number;
  z: number;
  unlockCost: number;
  interior: string;
}

export const SAFEHOUSES: SafehouseDef[] = [
  { id: "wharf-pad", name: "Wharf Pad", x: -260, z: 120, unlockCost: 0, interior: "pad-studio" },
  { id: "dartmouth-loft", name: "Dartmouth Loft", x: -3900, z: 420, unlockCost: 1200, interior: "loft" },
  { id: "island-cabin", name: "Island Cabin", x: 6100, z: 4480, unlockCost: 2500, interior: "cabin" },
];

export function unlockedSafehouses(owned: Iterable<string>): SafehouseDef[] {
  const set = new Set(owned);
  return SAFEHOUSES.filter((s) => s.unlockCost === 0 || set.has(s.id));
}

export function canUnlock(cash: number, id: string, owned: Iterable<string>): boolean {
  const s = SAFEHOUSES.find((h) => h.id === id);
  if (!s) return false;
  if (new Set(owned).has(id)) return false;
  return cash >= s.unlockCost;
}
