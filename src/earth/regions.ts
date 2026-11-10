// South Coast places and the highways that connect them.
//
// Photoreal play re-anchors an east-north-up frame on the chosen place.
// These anchors are WGS84. The original four earth drop points (New Bedford
// slice origin, Battleship Cove, Lizzie Borden, downtown Fall River) are
// unchanged. Brockton Main Street, Hyannis marina, and Hyannis Port match
// the validated stylized road spawns, converted from the New Bedford slice
// origin. Other towns are real civic locations so the tiles drop you in
// the actual place.

import type { LatLon } from "./geo";

export type RegionId = "fallRiver" | "newBedford" | "brockton" | "cape" | "southCoast";

export interface RegionInfo {
  id: RegionId;
  name: string;
  /** OSM slice in the New Bedford origin frame, when we have one. */
  slice: string | null;
}

export const REGIONS: RegionInfo[] = [
  { id: "fallRiver", name: "Fall River", slice: "slice-fallriver.json" },
  { id: "newBedford", name: "New Bedford", slice: "slice-newbedford.json" },
  { id: "brockton", name: "Brockton", slice: "slice-brockton.json" },
  { id: "cape", name: "Cape Cod", slice: "slice-cape.json" },
  { id: "southCoast", name: "South Coast", slice: null },
];

export interface Place {
  id: string;
  name: string;
  detail: string;
  region: RegionId;
  lat: number;
  lon: number;
  /** Content yaw. 0 faces south, matching the original earth spots. */
  heading: number;
  /**
   * Anchor is the New Bedford slice origin, and the player should spawn
   * via computeSpawn so they land on a street beside the Bethel.
   */
  sliceAligned?: boolean;
  /** Draw this region's OSM roads. Defaults to `region` when that region has a slice. */
  roads?: RegionId;
  /** Larger label on the regional chart. */
  major?: boolean;
  kind: "landmark" | "town" | "highway";
}

export interface Highway {
  name: string;
  points: LatLon[];
}

const P = (
  id: string,
  name: string,
  detail: string,
  region: RegionId,
  lat: number,
  lon: number,
  extra: Partial<Place> = {},
): Place => ({
  id, name, detail, region, lat, lon, heading: 0, kind: "town", ...extra,
});

export const PLACES: Place[] = [
  // Fall River — the Narrows
  P("the-narrows", "The Narrows", "Quequechan waterfront", "fallRiver", 41.7028, -71.1575, { kind: "landmark", major: true }),
  P("battleship-cove", "Battleship Cove", "USS Massachusetts", "fallRiver", 41.7044, -71.1641, { kind: "landmark", major: true }),
  P("lizzie-borden", "Lizzie Borden House", "230 Second Street", "fallRiver", 41.6993, -71.1558, { kind: "landmark" }),
  P("fr-downtown", "Downtown Fall River", "Government Center", "fallRiver", 41.7015, -71.1547, { kind: "town", major: true }),
  P("kennedy-park", "Kennedy Park", "Fall River", "fallRiver", 41.7094, -71.1478, { kind: "landmark" }),
  P("heritage-state-park", "Heritage State Park", "Fall River waterfront", "fallRiver", 41.7022, -71.1634, { kind: "landmark" }),

  // New Bedford
  P("nb-bethel", "New Bedford", "Seamen's Bethel", "newBedford", 41.636, -70.9205, { kind: "landmark", major: true, sliceAligned: true }),
  P("whaling-museum", "Whaling Museum", "Johnny Cake Hill", "newBedford", 41.6355, -70.9233, { kind: "landmark" }),
  P("state-pier", "State Pier", "New Bedford waterfront", "newBedford", 41.6342, -70.9188, { kind: "landmark" }),
  P("purchase-street", "Purchase Street", "Downtown New Bedford", "newBedford", 41.6366, -70.928, { kind: "town" }),
  P("buttonwood", "Buttonwood Park", "West New Bedford", "newBedford", 41.6354, -70.9526, { kind: "landmark" }),
  P("fort-taber", "Fort Taber", "Clark's Point", "newBedford", 41.5935, -70.9002, { kind: "landmark" }),
  P("clasky-common", "Clasky Common", "North New Bedford", "newBedford", 41.6418, -70.9336, { kind: "landmark" }),

  // Brockton
  P("brockton-downtown", "Downtown Brockton", "Main Street", "brockton", 42.08229, -71.02002, { kind: "town", major: true }),
  P("campello", "Campello", "South Brockton", "brockton", 42.068, -71.0185, { kind: "town" }),
  P("westgate", "Westgate Mall", "Brockton", "brockton", 42.0924, -71.0456, { kind: "landmark" }),
  P("brockton-hospital", "Brockton Hospital", "Centre Street", "brockton", 42.0839, -71.0468, { kind: "landmark" }),
  P("route24-brockton", "Route 24", "Brockton", "brockton", 42.094, -71.032, { kind: "highway" }),

  // Cape Cod
  P("hyannis-harbor", "Hyannis Harbor", "Ferry and marina", "cape", 41.65075, -70.27325, { kind: "landmark", major: true }),
  P("hyannis-main", "Hyannis", "Main Street", "cape", 41.6528, -70.2832, { kind: "town", major: true }),
  P("kennedy-compound", "Hyannis Port", "Kennedy Compound", "cape", 41.62984, -70.3024, { kind: "landmark" }),
  P("falmouth", "Falmouth", "Village Green", "cape", 41.5534, -70.6147, { kind: "town", major: true }),
  P("woods-hole", "Woods Hole", "Steamship terminal", "cape", 41.5236, -70.6707, { kind: "town" }),
  P("bourne-bridge", "Bourne Bridge", "Cape Cod Canal", "cape", 41.7476, -70.5902, { kind: "landmark", major: true }),
  P("sagamore-bridge", "Sagamore Bridge", "Cape Cod Canal", "cape", 41.7746, -70.5428, { kind: "landmark", major: true }),
  P("provincetown", "Provincetown", "MacMillan Wharf", "cape", 42.0519, -70.1856, { kind: "town", major: true }),
  P("chatham", "Chatham", "Main Street", "cape", 41.6821, -69.9598, { kind: "town", major: true }),
  P("mashpee", "Mashpee Commons", "Mashpee", "cape", 41.6168, -70.4812, { kind: "town" }),
  P("barnstable", "Barnstable Village", "Route 6A", "cape", 41.7004, -70.3036, { kind: "town" }),
  P("sandwich", "Sandwich", "Town center", "cape", 41.7595, -70.4939, { kind: "town" }),
  P("route25-bourne", "Route 25", "Bourne", "cape", 41.7505, -70.605, { kind: "highway" }),
  P("route6-orleans", "Route 6", "Orleans", "cape", 41.7898, -69.9892, { kind: "highway" }),

  // Surrounding South Coast towns, and the highway pulls between the cities.
  P("fort-phoenix", "Fort Phoenix", "Fairhaven", "southCoast", 41.6253, -70.904, { kind: "landmark", roads: "newBedford" }),
  P("fairhaven", "Fairhaven", "Center", "southCoast", 41.6375, -70.9038, { kind: "town", roads: "newBedford" }),
  P("dartmouth-mall", "Dartmouth Mall", "North Dartmouth", "southCoast", 41.643, -70.991, { kind: "landmark", roads: "newBedford" }),
  P("padanaram", "Padanaram", "South Dartmouth", "southCoast", 41.576, -70.94, { kind: "town", roads: "newBedford" }),
  P("westport", "Westport", "Central Village", "southCoast", 41.6315, -71.069, { kind: "town", roads: "newBedford" }),
  P("acushnet", "Acushnet", "Center", "southCoast", 41.6805, -70.9078, { kind: "town", roads: "newBedford" }),
  P("somerset", "Somerset", "County Street", "southCoast", 41.7485, -71.1289, { kind: "town" }),
  P("swansea", "Swansea", "Route 6", "southCoast", 41.7482, -71.1898, { kind: "town" }),
  P("taunton-green", "Taunton Green", "Taunton", "southCoast", 41.9002, -71.0899, { kind: "town", major: true }),
  P("wareham", "Wareham", "Main Street", "southCoast", 41.758, -70.722, { kind: "town", major: true }),
  P("mattapoisett", "Mattapoisett", "Harbor", "southCoast", 41.6615, -70.8168, { kind: "town" }),
  P("marion", "Marion", "Wharf village", "southCoast", 41.7004, -70.7628, { kind: "town" }),
  P("assonet", "Assonet", "Freetown", "southCoast", 41.7958, -71.0672, { kind: "town" }),
  P("middleborough", "Middleborough", "Center", "southCoast", 41.8934, -70.911, { kind: "town" }),
  P("lakeville", "Lakeville", "Center", "southCoast", 41.847, -70.9495, { kind: "town" }),
  P("onset", "Onset", "Wareham", "southCoast", 41.7415, -70.6595, { kind: "town" }),
  P("buzzards-bay", "Buzzards Bay", "US 6", "southCoast", 41.7452, -70.6155, { kind: "town" }),
  P("i195-new-bedford", "I-195", "New Bedford", "newBedford", 41.6788, -70.9405, { kind: "highway" }),
  P("i195-wareham", "I-195", "Wareham", "southCoast", 41.7605, -70.7205, { kind: "highway" }),
  P("route24-taunton", "Route 24", "Taunton", "southCoast", 41.909, -71.078, { kind: "highway" }),
  P("route6-fairhaven", "Route 6", "Fairhaven", "southCoast", 41.6505, -70.8805, { kind: "highway", roads: "newBedford" }),
];

export const HIGHWAYS: Highway[] = [
  {
    name: "I-195",
    points: [
      { lat: 41.77, lon: -71.21 },
      { lat: 41.735, lon: -71.175 },
      { lat: 41.712, lon: -71.16 },
      { lat: 41.7055, lon: -71.158 },
      { lat: 41.7015, lon: -71.135 },
      { lat: 41.69, lon: -71.09 },
      { lat: 41.675, lon: -71.03 },
      { lat: 41.67, lon: -70.99 },
      { lat: 41.676, lon: -70.945 },
      { lat: 41.662, lon: -70.89 },
      { lat: 41.658, lon: -70.83 },
      { lat: 41.685, lon: -70.77 },
      { lat: 41.735, lon: -70.735 },
      { lat: 41.758, lon: -70.72 },
    ],
  },
  {
    name: "Route 24",
    points: [
      { lat: 41.71, lon: -71.148 },
      { lat: 41.76, lon: -71.105 },
      { lat: 41.8, lon: -71.072 },
      { lat: 41.86, lon: -71.085 },
      { lat: 41.9, lon: -71.09 },
      { lat: 41.945, lon: -71.045 },
      { lat: 41.99, lon: -71.015 },
      { lat: 42.04, lon: -71.025 },
      { lat: 42.083, lon: -71.028 },
      { lat: 42.13, lon: -71.02 },
    ],
  },
  {
    name: "US 6",
    points: [
      { lat: 41.725, lon: -71.19 },
      { lat: 41.71, lon: -71.15 },
      { lat: 41.68, lon: -71.09 },
      { lat: 41.655, lon: -70.99 },
      { lat: 41.648, lon: -70.935 },
      { lat: 41.642, lon: -70.88 },
      { lat: 41.66, lon: -70.82 },
      { lat: 41.705, lon: -70.76 },
      { lat: 41.755, lon: -70.69 },
      { lat: 41.748, lon: -70.62 },
      { lat: 41.772, lon: -70.545 },
      { lat: 41.74, lon: -70.45 },
      { lat: 41.705, lon: -70.36 },
      { lat: 41.68, lon: -70.3 },
      { lat: 41.705, lon: -70.2 },
      { lat: 41.745, lon: -70.08 },
      { lat: 41.79, lon: -70.0 },
      { lat: 41.9, lon: -70.02 },
      { lat: 42.0, lon: -70.08 },
      { lat: 42.05, lon: -70.18 },
    ],
  },
  {
    name: "Route 25",
    points: [
      { lat: 41.758, lon: -70.722 },
      { lat: 41.752, lon: -70.66 },
      { lat: 41.748, lon: -70.6 },
    ],
  },
  {
    name: "Route 28",
    points: [
      { lat: 41.748, lon: -70.6 },
      { lat: 41.68, lon: -70.62 },
      { lat: 41.58, lon: -70.62 },
      { lat: 41.553, lon: -70.61 },
      { lat: 41.57, lon: -70.54 },
      { lat: 41.62, lon: -70.48 },
      { lat: 41.645, lon: -70.38 },
      { lat: 41.652, lon: -70.29 },
      { lat: 41.655, lon: -70.2 },
      { lat: 41.67, lon: -70.08 },
      { lat: 41.682, lon: -69.96 },
    ],
  },
];

export const DEFAULT_PLACE_ID = "nb-bethel";

const BY_ID = new Map(PLACES.map((p) => [p.id, p]));

export function placeById(id: string): Place | undefined {
  return BY_ID.get(id);
}

export function regionInfo(id: RegionId): RegionInfo {
  const found = REGIONS.find((r) => r.id === id);
  if (!found) throw new Error(`unknown region ${id}`);
  return found;
}

export function regionName(id: RegionId): string {
  return regionInfo(id).name;
}

export function placesInRegion(id: RegionId): Place[] {
  return PLACES.filter((p) => p.region === id);
}

/** OSM slice that should be drawn around this place, if any. */
export function roadsSliceFor(place: Place): string | null {
  const region = place.roads ?? place.region;
  return regionInfo(region).slice;
}

export function anchorOf(place: Place): LatLon {
  return { lat: place.lat, lon: place.lon };
}
