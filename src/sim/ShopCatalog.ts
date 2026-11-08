/**
 * §4.4 Shop catalog — ammo / weapons / clothes / garage storage.
 */

export type ShopKind = "ammo" | "weapons" | "clothes" | "garage";

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  kind: ShopKind;
  /** Wanted stars above which purchase is refused. */
  maxWanted?: number;
  /** Mission id required. */
  requiresMission?: string;
  payload: Record<string, unknown>;
}

export interface ShopDef {
  id: string;
  kind: ShopKind;
  name: string;
  x: number;
  z: number;
  items: ShopItem[];
}

export const SHOPS: ShopDef[] = [
  {
    id: "ammo-kempton",
    kind: "ammo",
    name: "Kempton Ammo",
    x: -290,
    z: 110,
    items: [
      { id: "ammo-pistol", name: "Pistol rounds", cost: 40, kind: "ammo", payload: { pistol: 24 } },
      { id: "ammo-shotgun", name: "Shells", cost: 60, kind: "ammo", payload: { shotgun: 12 } },
    ],
  },
  {
    id: "arms-wharf",
    kind: "weapons",
    name: "Wharf Arms",
    x: -260,
    z: 95,
    items: [
      { id: "w-pistol", name: "Service pistol", cost: 350, kind: "weapons", maxWanted: 2, payload: { weapon: "pistol" } },
      { id: "w-shotgun", name: "Riot shotgun", cost: 700, kind: "weapons", maxWanted: 1, requiresMission: "garage-chop", payload: { weapon: "shotgun" } },
    ],
  },
  {
    id: "threads",
    kind: "clothes",
    name: "Harbor Threads",
    x: -275,
    z: 70,
    items: [
      { id: "c-work", name: "Dock jacket", cost: 80, kind: "clothes", payload: { outfit: "dock" } },
      { id: "c-night", name: "Night suit", cost: 220, kind: "clothes", payload: { outfit: "night" } },
    ],
  },
  {
    id: "garage-storage",
    kind: "garage",
    name: "Anvil Storage",
    x: -320,
    z: 60,
    items: [
      { id: "store-car", name: "Store current car", cost: 0, kind: "garage", payload: { action: "store" } },
      { id: "fetch-car", name: "Fetch stored car", cost: 50, kind: "garage", payload: { action: "fetch" } },
    ],
  },
];

export interface PurchaseCtx {
  cash: number;
  wanted: number;
  missionsDone: string[];
}

export function canPurchase(item: ShopItem, ctx: PurchaseCtx): { ok: boolean; reason?: string } {
  if (ctx.cash < item.cost) return { ok: false, reason: "cash" };
  if (item.maxWanted != null && ctx.wanted > item.maxWanted) return { ok: false, reason: "wanted" };
  if (item.requiresMission && !ctx.missionsDone.includes(item.requiresMission)) {
    return { ok: false, reason: "mission" };
  }
  return { ok: true };
}

export function nearestShop(x: number, z: number, maxDist = 12): ShopDef | null {
  let best: ShopDef | null = null;
  let bestD = maxDist * maxDist;
  for (const s of SHOPS) {
    const d = (s.x - x) ** 2 + (s.z - z) ** 2;
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}
