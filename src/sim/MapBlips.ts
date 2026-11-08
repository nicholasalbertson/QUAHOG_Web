/**
 * §10.2.3 Richer blips (shops/safehouses/races/collectibles).
 */

export type BlipKind = "shop" | "safehouse" | "race" | "collectible" | "mission" | "player" | "wanted";

export interface MapBlip {
  id: string;
  kind: BlipKind;
  x: number;
  z: number;
  label?: string;
}

export const BLIP_ICONS: Record<BlipKind, string> = {
  shop: "$",
  safehouse: "H",
  race: "🏁",
  collectible: "◆",
  mission: "!",
  player: "P",
  wanted: "★",
};

export function blipsFromManifest(parts: {
  fronts?: { id: string; x: number; z: number; name?: string }[];
  raceTracks?: { id: string; name: string }[];
  collectibles?: { id: string; x: number; z: number }[];
  markers?: { id: string; kind: string; x: number; z: number; label?: string }[];
}): MapBlip[] {
  const out: MapBlip[] = [];
  for (const f of parts.fronts ?? []) {
    out.push({ id: f.id, kind: "shop", x: f.x, z: f.z, label: f.name });
  }
  for (const c of parts.collectibles ?? []) {
    out.push({ id: c.id, kind: "collectible", x: c.x, z: c.z });
  }
  for (const m of parts.markers ?? []) {
    if (m.kind === "safehouse" || m.kind === "mission") {
      out.push({ id: m.id, kind: m.kind as BlipKind, x: m.x, z: m.z, label: m.label });
    }
  }
  // Race tracks lack coords here — blips attached when player near start later.
  for (const r of parts.raceTracks ?? []) {
    out.push({ id: r.id, kind: "race", x: 0, z: 0, label: r.name });
  }
  return out;
}
