/**
 * §1.6 WorldManifest — authored env schema + runtime validator.
 * Bootstraps from a Slice until dedicated JSON authoring lands.
 */

import type { Slice, Road, Landmark } from "../slice";

export interface ZoneDef {
  id: string;
  name: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface SpawnDef {
  id: string;
  kind: "player" | "traffic" | "ped" | "boat" | "mission";
  x: number;
  z: number;
}

export interface MarkerDef {
  id: string;
  kind: string;
  x: number;
  z: number;
  label?: string;
}

export interface WorldManifest {
  version: number;
  name: string;
  zones: ZoneDef[];
  roads: Road[];
  landmarks: Landmark[];
  markers: MarkerDef[];
  spawns: SpawnDef[];
  doors: { id: string; x: number; z: number; building?: string }[];
  signals: { id: string; x: number; z: number }[];
  raceTracks: { id: string; name: string; checkpoints?: number }[];
  collectibles: { id: string; kind: string; x: number; z: number }[];
  fronts: { id: string; name: string; x: number; z: number; cost: number }[];
  territories: { id: string; faction: string; points?: [number, number][] }[];
}

export interface ManifestValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Build a minimal manifest from the loaded OSM slice. */
export function manifestFromSlice(slice: Slice): WorldManifest {
  const xs = slice.buildings.flatMap((b) => b.footprint.map((p) => p[0]));
  const ns = slice.buildings.flatMap((b) => b.footprint.map((p) => p[1]));
  const minX = xs.length ? Math.min(...xs) : -500;
  const maxX = xs.length ? Math.max(...xs) : 500;
  const minZ = ns.length ? -Math.max(...ns) : -500;
  const maxZ = ns.length ? -Math.min(...ns) : 500;

  return {
    version: 1,
    name: slice.name,
    zones: [{ id: "core", name: slice.name, bounds: { minX, maxX, minZ, maxZ } }],
    roads: slice.roads,
    landmarks: slice.landmarks,
    markers: slice.landmarks.map((l, i) => ({
      id: `lm-${i}`,
      kind: l.kind,
      x: l.pos[0],
      z: -l.pos[1],
      label: l.name,
    })),
    spawns: [
      { id: "player-start", kind: "player", x: 0, z: 0 },
      ...slice.landmarks.slice(0, 8).map((l, i) => ({
        id: `ped-spawn-${i}`,
        kind: "ped" as const,
        x: l.pos[0],
        z: -l.pos[1],
      })),
    ],
    // §1.2.6 / §1.6 door stubs from building footprints (south edge midpoints).
    doors: slice.buildings.slice(0, 120).map((b, i) => {
      let best = 0, bestN = Infinity;
      for (let k = 0; k < b.footprint.length; k++) {
        if (b.footprint[k][1] < bestN) { bestN = b.footprint[k][1]; best = k; }
      }
      const j = (best + 1) % b.footprint.length;
      const x = (b.footprint[best][0] + b.footprint[j][0]) / 2;
      const z = -((b.footprint[best][1] + b.footprint[j][1]) / 2);
      return { id: `door-${i}`, x, z, building: b.name };
    }),
    signals: slice.roads
      .filter((r) => ["primary", "secondary", "tertiary"].includes(r.highway) && r.points.length >= 2)
      .slice(0, 24)
      .map((r, i) => ({ id: `sig-${i}`, x: r.points[0][0], z: -r.points[0][1] })),
    raceTracks: [
      { id: "harbor-loop", name: "Harbor Loop", checkpoints: 3 },
      { id: "rt6-dash", name: "Route 6 Dash", checkpoints: 3 },
      { id: "island-wake", name: "Island Wake", checkpoints: 3 },
    ],
    collectibles: [
      // Scrimshaw spots mirrored from Collectibles.tsx (core set).
      { id: "scrim-0", kind: "scrimshaw", x: -272, z: 106 },
      { id: "scrim-1", kind: "scrimshaw", x: -244, z: 70 },
      { id: "scrim-2", kind: "scrimshaw", x: -300, z: 130 },
      { id: "scrim-3", kind: "scrimshaw", x: -210, z: 100 },
      { id: "scrim-4", kind: "scrimshaw", x: -330, z: 80 },
      { id: "scrim-5", kind: "scrimshaw", x: -256, z: 150 },
      { id: "scrim-6", kind: "scrimshaw", x: -225, z: 60 },
      { id: "scrim-7", kind: "scrimshaw", x: -290, z: 175 },
    ],
    fronts: [
      { id: "anvil", name: "The Anvil Garage", x: -320, z: 60, cost: 500 },
      { id: "quohog", name: "Quohog Republic", x: -240, z: 122, cost: 800 },
      { id: "linq", name: "Linguiça Linq", x: -300, z: 92, cost: 650 },
      { id: "marealta", name: "Maré Alta Records", x: -262, z: 60, cost: 700 },
      { id: "whalingcab", name: "Whaling City Cab", x: -220, z: 176, cost: 900 },
      { id: "longisland", name: "Off the Hook", x: 6092, z: 4485, cost: 1800 },
      { id: "dartmall", name: "Dartmouth Mall", x: -3921, z: 398, cost: 2500 },
    ],
    territories: [
      {
        id: "wharf",
        faction: "wharf",
        // Approximate dock polygon for §3.4 wiring.
        points: [
          [-280, 80],
          [-200, 80],
          [-200, 160],
          [-280, 160],
        ],
      },
    ],
  };
}

export function validateManifest(m: unknown): ManifestValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!m || typeof m !== "object") return { ok: false, errors: ["manifest root must be object"], warnings };
  const man = m as WorldManifest;
  if (typeof man.version !== "number") errors.push("version: missing number");
  if (!man.name) errors.push("name: required");
  if (!Array.isArray(man.zones)) errors.push("zones: required array");
  if (!Array.isArray(man.roads)) errors.push("roads: required array");
  if (!Array.isArray(man.markers)) errors.push("markers: required array");
  if (Array.isArray(man.markers)) {
    const ids = new Set<string>();
    for (const mk of man.markers) {
      if (!mk.id) errors.push("marker missing id");
      else if (ids.has(mk.id)) errors.push(`duplicate marker id ${mk.id}`);
      else ids.add(mk.id);
    }
  }
  if (Array.isArray(man.roads) && man.roads.length === 0) warnings.push("roads: empty");
  return { ok: errors.length === 0, errors, warnings };
}
