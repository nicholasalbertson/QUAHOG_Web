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

export interface PurchaseBag {
  cash: number;
  pistol?: number;
  shotgun?: number;
  weapon?: string;
  outfit?: string;
  garageAction?: string;
}

/** §4.4.6 Apply a purchase immediately into a bag + cash. */
export function applyPurchase(
  item: ShopItem,
  bag: PurchaseBag,
): { ok: boolean; bag: PurchaseBag; reason?: string } {
  if (bag.cash < item.cost) return { ok: false, bag, reason: "cash" };
  const next: PurchaseBag = { ...bag, cash: bag.cash - item.cost };
  const p = item.payload;
  if (typeof p.pistol === "number") next.pistol = (next.pistol ?? 0) + p.pistol;
  if (typeof p.shotgun === "number") next.shotgun = (next.shotgun ?? 0) + p.shotgun;
  if (typeof p.weapon === "string") next.weapon = p.weapon;
  if (typeof p.outfit === "string") next.outfit = p.outfit;
  if (typeof p.action === "string") next.garageAction = p.action;
  return { ok: true, bag: next };
}

/** §4.4.5 Interim counter prompt near a shop. */
export function shopCounterPrompt(shop: ShopDef): {
  id: string;
  kind: "shop";
  label: string;
  priority: number;
  x: number;
  z: number;
  radius: number;
} {
  return {
    id: `shop:${shop.id}`,
    kind: "shop",
    label: `${shop.name} · browse`,
    priority: 4,
    x: shop.x,
    z: shop.z,
    radius: 3.5,
  };
}
