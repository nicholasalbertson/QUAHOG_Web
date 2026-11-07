/**
 * §1.6 WorldManifest — authored env schema + runtime validator.
 * Bootstraps from a Slice until dedicated JSON authoring lands.
 */

import type { Slice, Road, Landmark } from "../slice";
import { DISTRICTS, districtOfWorld, type DistrictId } from "../districts";
import { BUSINESSES } from "../economy";
import { SCRIMSHAW_SPOTS } from "../content/scrimshawSpots";

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
  raceTracks: { id: string; name: string }[];
  collectibles: { id: string; kind: string; x: number; z: number }[];
  fronts: { id: string; name: string; x: number; z: number; cost: number }[];
  territories: { id: string; faction: string }[];
}

export interface ManifestValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function resolveDistrict(slice: Slice, districtId?: DistrictId): DistrictId {
  if (districtId) return districtId;
  const byFile = (Object.values(DISTRICTS) as (typeof DISTRICTS)[DistrictId][]).find(
    (d) => d.sliceFile.replace(/\.json$/, "") === slice.name.replace(/\s+/g, "-").toLowerCase(),
  );
  if (byFile) return byFile.id;
  const lower = slice.name.toLowerCase();
  if (lower.includes("fall river")) return "fallRiver";
  if (lower.includes("brockton")) return "brockton";
  if (lower.includes("cape") || lower.includes("hyannis")) return "cape";
  return "newBedford";
}

/** Build a minimal manifest from the loaded OSM slice (+ district zone / fronts). */
export function manifestFromSlice(slice: Slice, districtId?: DistrictId): WorldManifest {
  const xs = slice.buildings.flatMap((b) => b.footprint.map((p) => p[0]));
  const ns = slice.buildings.flatMap((b) => b.footprint.map((p) => p[1]));
  const minX = xs.length ? Math.min(...xs) : -500;
  const maxX = xs.length ? Math.max(...xs) : 500;
  const minZ = ns.length ? -Math.max(...ns) : -500;
  const maxZ = ns.length ? -Math.min(...ns) : 500;

  const did = resolveDistrict(slice, districtId);
  const district = DISTRICTS[did];
  const zones: ZoneDef[] = [{ id: "core", name: slice.name, bounds: { minX, maxX, minZ, maxZ } }];
  if (district.bounds) {
    zones.push({
      id: district.id,
      name: district.name,
      bounds: {
        minX: district.bounds.xMin,
        maxX: district.bounds.xMax,
        minZ: district.bounds.zMin,
        maxZ: district.bounds.zMax,
      },
    });
  }

  const inDistrict = (x: number, z: number) => districtOfWorld(x, z) === did;

  const fronts = BUSINESSES.filter((b) => inDistrict(b.pos[0], b.pos[2])).map((b) => ({
    id: b.id,
    name: b.name,
    x: b.pos[0],
    z: b.pos[2],
    cost: b.cost,
  }));
  const collectibles = SCRIMSHAW_SPOTS.filter((s) => inDistrict(s[0], s[2])).map((s, i) => ({
    id: `scrimshaw-${did}-${i}`,
    kind: "scrimshaw",
    x: s[0],
    z: s[2],
  }));

  return {
    version: 1,
    name: slice.name,
    zones,
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
      { id: "player-start", kind: "player", x: district.spawn[0], z: district.spawn[1] },
    ],
    doors: [],
    signals: [],
    raceTracks: [],
    collectibles,
    fronts,
    territories: [],
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
  return { ok: errors.length === 0, errors, warnings };
}
