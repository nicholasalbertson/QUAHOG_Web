/**
 * §6.1.4 Wardrobe (ties to §4.4 clothing economy).
 */

export interface Outfit {
  id: string;
  name: string;
  cost: number;
  unlocked: boolean;
}

export const OUTFITS: Outfit[] = [
  { id: "street", name: "Street Clothes", cost: 0, unlocked: true },
  { id: "dock", name: "Dock Worker", cost: 150, unlocked: false },
  { id: "evening", name: "Evening Wear", cost: 400, unlocked: false },
  { id: "wetsuit", name: "Wetsuit", cost: 250, unlocked: false },
];

export interface WardrobeState {
  equipped: string;
  owned: string[];
}

export function createWardrobe(): WardrobeState {
  return { equipped: "street", owned: ["street"] };
}

export function buyOutfit(s: WardrobeState, id: string, cash: number): { ok: boolean; cost: number } {
  const o = OUTFITS.find((x) => x.id === id);
  if (!o) return { ok: false, cost: 0 };
  if (s.owned.includes(id)) return { ok: false, cost: 0 };
  if (cash < o.cost) return { ok: false, cost: o.cost };
  s.owned.push(id);
  return { ok: true, cost: o.cost };
}

export function equipOutfit(s: WardrobeState, id: string): boolean {
  if (!s.owned.includes(id)) return false;
  s.equipped = id;
  return true;
}
