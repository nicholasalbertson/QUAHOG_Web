/**
 * §3.4.3 NPC response per faction (drive-bys, foot squads).
 */

export type FactionResponse = "none" | "warn" | "foot-squad" | "drive-by";

export function factionResponse(opts: {
  hostility: number; // 0..1
  inTerritory: boolean;
  wanted: number;
}): FactionResponse {
  if (!opts.inTerritory) return "none";
  if (opts.hostility < 0.25) return "warn";
  if (opts.hostility < 0.6 || opts.wanted < 2) return "foot-squad";
  return "drive-by";
}

/** §3.4.5 Hostile entry escalates within one block (~80m). */
export function hostileEntryEscalate(distIntoTerritory: number, blockM = 80): boolean {
  return distIntoTerritory <= blockM;
}
