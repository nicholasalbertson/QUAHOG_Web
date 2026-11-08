/**
 * §1.5.T3 v1→v2 migration fixtures (≥ 5 real legacy shapes).
 */

import { SCHEMA_VERSION, type SaveBlobV2 } from "./SaveGame";

/** Minimal legacy v1-shaped blobs (pre-unified schema). */
export const LEGACY_V1_FIXTURES: Record<string, unknown>[] = [
  { version: 1, cash: 100, day: 1, hour: 8, police: 0 },
  { version: 1, cash: 0, day: 3, hour: 22, police: 2, economy: { anvil: true } },
  { version: 1, cash: 5000, day: 10, hour: 14, police: 0, inventory: { pistol: 1, shotgun: 0 } },
  { version: 1, cash: 250, day: 2, hour: 6, police: 1, position: { px: 10, pz: -20 }, mode: "foot" },
  { version: 1, cash: 80, day: 5, hour: 18, police: 0, mission: { mi: 0, step: 1, done: false }, scrimshaw: 1 },
];

export function migrateLegacyFixture(raw: Record<string, unknown>): SaveBlobV2 {
  const inv = raw.inventory as { pistol?: number; shotgun?: number } | undefined;
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: Date.now(),
    build: "fixture-migrate",
    stats: {
      cash: typeof raw.cash === "number" ? raw.cash : 0,
      health: 100,
      police: typeof raw.police === "number" ? raw.police : 0,
      faction: 0,
    },
    economy: (raw.economy as Record<string, true>) ?? undefined,
    mission: (raw.mission as SaveBlobV2["mission"]) ?? undefined,
    position: (raw.position as Record<string, unknown>) ?? undefined,
    inventory: inv
      ? { pistol: inv.pistol ?? 0, shotgun: inv.shotgun ?? 0 }
      : undefined,
    scrimshaw: typeof raw.scrimshaw === "number" ? raw.scrimshaw : undefined,
    clockWeather: {
      day: typeof raw.day === "number" ? raw.day : 1,
      hour: typeof raw.hour === "number" ? raw.hour : 8,
      weather: "clear",
    },
  };
}
