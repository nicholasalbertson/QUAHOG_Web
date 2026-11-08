/**
 * §10.2.1 Map legend entries.
 */

export interface LegendEntry {
  id: string;
  label: string;
  color: string;
  kind: "mission" | "safehouse" | "shop" | "collectible" | "wanted" | "player" | "front";
}

export const MAP_LEGEND: LegendEntry[] = [
  { id: "player", label: "You", color: "#7ad9ff", kind: "player" },
  { id: "mission", label: "Mission", color: "#ffd24a", kind: "mission" },
  { id: "safehouse", label: "Safehouse", color: "#4ad66d", kind: "safehouse" },
  { id: "shop", label: "Shop", color: "#c9a0ff", kind: "shop" },
  { id: "front", label: "Business", color: "#4ad6c4", kind: "front" },
  { id: "collectible", label: "Scrimshaw", color: "#f3ead2", kind: "collectible" },
  { id: "wanted", label: "Police", color: "#ff5a5a", kind: "wanted" },
];

export function legendFor(kind: LegendEntry["kind"]): LegendEntry | undefined {
  return MAP_LEGEND.find((e) => e.kind === kind);
}
