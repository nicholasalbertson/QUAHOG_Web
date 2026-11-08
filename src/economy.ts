import { create } from "zustand";

// Property / business empire (§15 AcquisitionEngine + RevenueManager, §17 economy).
// Buy fronts around the city; owned fronts trickle income into the wallet.

export interface Business {
  id: string;
  name: string;
  blurb: string;
  pos: [number, number, number];
  cost: number;
  perDay: number; // income per in-game day
  /** §4.1.1 Risk 0..1 for boom/leak bias. */
  risk?: number;
  /** Optional mission id unlocked when owned (§4.3). */
  unlockMission?: string;
}

export interface FrontUpgrade {
  tier: number;
  incomeMul: number;
  riskMul: number;
  cost: number;
}

/** §4.2.1 Upgrade tiers. */
export const UPGRADE_TIERS: FrontUpgrade[] = [
  { tier: 0, incomeMul: 1, riskMul: 1, cost: 0 },
  { tier: 1, incomeMul: 1.25, riskMul: 0.9, cost: 400 },
  { tier: 2, incomeMul: 1.55, riskMul: 0.8, cost: 900 },
  { tier: 3, incomeMul: 2, riskMul: 0.7, cost: 1800 },
];

// Original SouthCoast fronts (parody flavour, original names).
export const BUSINESSES: Business[] = [
  { id: "anvil", name: "The Anvil Garage", blurb: "chop shop", pos: [-320, 0, 60], cost: 500, perDay: 220, risk: 0.45, unlockMission: "garage-chop" },
  { id: "quohog", name: "Quohog Republic", blurb: "dockside bar", pos: [-240, 0, 122], cost: 800, perDay: 320, risk: 0.35 },
  { id: "linq", name: "Linguiça Linq", blurb: "all-night diner", pos: [-300, 0, 92], cost: 650, perDay: 260, risk: 0.25 },
  { id: "marealta", name: "Maré Alta Records", blurb: "record shop", pos: [-262, 0, 60], cost: 700, perDay: 280, risk: 0.2 },
  { id: "whalingcab", name: "Whaling City Cab", blurb: "taxi depot", pos: [-220, 0, 176], cost: 900, perDay: 360, risk: 0.3, unlockMission: "cab-run" },
  // out on Sconticut Neck toward Long Island — 56 Goulart Memorial Drive
  { id: "longisland", name: "Off the Hook Bar and Grill", blurb: "Long Island waterfront bar & marina", pos: [6092, 0, 4485], cost: 1800, perDay: 600, risk: 0.4 },
  { id: "dartmall", name: "Dartmouth Mall", blurb: "Route 6 retail hub", pos: [-3921, 0, 398], cost: 2500, perDay: 850, risk: 0.15 },
];

// Where the pilotable boat is moored (just off the Long Island marina).
export const BOAT_SPAWN: [number, number, number] = [6130, 0.6, 4520];

const KEY = "mounthope.economy.v1";

interface EconomyPersist {
  owned: Record<string, true>;
  tiers?: Record<string, number>;
  employees?: Record<string, number>;
}

interface EconomyState {
  owned: Record<string, true>;
  /** §4.2.1 Per-front upgrade tier. */
  tiers: Record<string, number>;
  /** §4.2.2 Employee count per front. */
  employees: Record<string, number>;
  near: Business | null;
  buy: (b: Business) => void; // assumes affordability checked by caller
  /** §4.2.3 Sell with 60% refund penalty. */
  sell: (id: string) => number;
  upgrade: (id: string) => number | null;
  hire: (id: string) => number | null;
  setNear: (b: Business | null) => void;
  incomePerSec: (daySeconds: number) => number;
  /** §4.3 Mission ids unlocked by ownership. */
  unlockedMissions: () => string[];
  save: () => void;
  load: () => void;
}

export const useEconomy = create<EconomyState>((set, get) => ({
  owned: {},
  tiers: {},
  employees: {},
  near: null,
  buy: (b) => set((s) => ({ owned: { ...s.owned, [b.id]: true } })),
  sell: (id) => {
    const b = BUSINESSES.find((x) => x.id === id);
    if (!b || !get().owned[id]) return 0;
    const refund = Math.round(b.cost * 0.6);
    set((s) => {
      const owned = { ...s.owned };
      delete owned[id];
      const tiers = { ...s.tiers };
      delete tiers[id];
      const employees = { ...s.employees };
      delete employees[id];
      return { owned, tiers, employees };
    });
    return refund;
  },
  upgrade: (id) => {
    if (!get().owned[id]) return null;
    const cur = get().tiers[id] ?? 0;
    const next = UPGRADE_TIERS.find((t) => t.tier === cur + 1);
    if (!next) return null;
    set((s) => ({ tiers: { ...s.tiers, [id]: next.tier } }));
    return next.cost;
  },
  hire: (id) => {
    if (!get().owned[id]) return null;
    const n = (get().employees[id] ?? 0) + 1;
    if (n > 5) return null;
    const cost = 150 + n * 50;
    set((s) => ({ employees: { ...s.employees, [id]: n } }));
    return cost;
  },
  setNear: (b) => set((s) => (s.near?.id === b?.id ? s : { near: b })),
  incomePerSec: (daySeconds) => {
    // A zero/negative/NaN day length would divide to Infinity/NaN and corrupt
    // the wallet on the next income tick — guard it.
    if (!Number.isFinite(daySeconds) || daySeconds <= 0) return 0;
    const { owned, tiers, employees } = get();
    let perDay = 0;
    for (const b of BUSINESSES) {
      if (!owned[b.id]) continue;
      const tier = UPGRADE_TIERS[tiers[b.id] ?? 0] ?? UPGRADE_TIERS[0];
      const staff = employees[b.id] ?? 0;
      perDay += b.perDay * tier.incomeMul * (1 + staff * 0.08);
    }
    return perDay / daySeconds;
  },
  unlockedMissions: () => {
    const { owned } = get();
    const ids: string[] = [];
    for (const b of BUSINESSES) {
      if (owned[b.id] && b.unlockMission) ids.push(b.unlockMission);
    }
    return ids;
  },
  save: () => {
    try {
      const { owned, tiers, employees } = get();
      const payload: EconomyPersist = { owned, tiers, employees };
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch { /* ignore */ }
  },
  load: () => {
    try {
      const r = localStorage.getItem(KEY);
      if (!r) return;
      const parsed = JSON.parse(r);
      // Only accept a plain object map; ignore arrays/strings/null from a
      // corrupt save so `owned[b.id]` lookups can't throw or misbehave.
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      // Legacy: bare owned map without tiers.
      const src = (parsed as EconomyPersist).owned
        ? (parsed as EconomyPersist)
        : { owned: parsed as Record<string, true>, tiers: {}, employees: {} };
      const owned: Record<string, true> = {};
      for (const b of BUSINESSES) if (src.owned?.[b.id]) owned[b.id] = true;
      const tiers: Record<string, number> = {};
      const employees: Record<string, number> = {};
      for (const id of Object.keys(owned)) {
        if (typeof src.tiers?.[id] === "number") tiers[id] = src.tiers[id];
        if (typeof src.employees?.[id] === "number") employees[id] = src.employees[id];
      }
      set({ owned, tiers, employees });
    } catch { /* ignore malformed save */ }
  },
}));

// --- RevenueManager: margin-leak / boom events (§15/§17) ---------------------
// Beyond the steady passive trickle, owned fronts occasionally throw a one-off
// windfall or loss — a feast-week rush, a skimmed register, a "protection"
// envelope coming due. Flavour only; amounts scale to a fraction of the front's
// daily take so they matter without swinging the economy.
export interface RevenueEvent { good: boolean; text: string; amount: number }

const BOOM = [
  "{name}: feast-week rush — takings up {amt}",
  "{name}: a tour bus emptied out front — +{amt}",
  "{name}: the fleet came in heavy, big spenders — +{amt}",
  "{name}: cash-only Friday, clean books — +{amt}",
  "{name}: cruise-night crowd packed it — +{amt}",
];
const LEAK = [
  "{name}: health inspector 'visit' — -{amt}",
  "{name}: walk-in freezer died — -{amt}",
  "{name}: register came up short — -{amt}",
  "{name}: a pipe let go out back — -{amt}",
  "{name}: protection envelope came due — -{amt}",
];

export function ownedBusinesses(): Business[] {
  const { owned } = useEconomy.getState();
  return BUSINESSES.filter((b) => owned[b.id]);
}

/** Roll one revenue event for a random owned front, or null if you own none. */
export function rollRevenueEvent(rng: () => number = Math.random): RevenueEvent | null {
  const owned = ownedBusinesses();
  if (!owned.length) return null;
  const b = owned[Math.floor(rng() * owned.length)];
  const good = rng() < 0.55; // lean slightly toward booms
  const amount = Math.round(b.perDay * (0.4 + rng() * 0.8));
  const pool = good ? BOOM : LEAK;
  const text = pool[Math.floor(rng() * pool.length)]
    .replace("{name}", b.name)
    .replace("{amt}", `$${amount}`);
  return { good, text, amount: good ? amount : -amount };
}
