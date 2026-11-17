// Landmark pins shared by both builds. Coordinates are the catalog points
// already used for GO TO, plus the Braga Bridge span and the downtown
// Brockton statue. A visit inside the radius is written once.

import { latLonToLocal, type LatLon } from "../earth/geo";

export interface DiscoveryPin {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lon: number;
}

export const DISCOVERY: DiscoveryPin[] = [
  { id: "lizzie-borden", name: "Lizzie Borden House", detail: "230 Second Street, Fall River", lat: 41.6993, lon: -71.1558 },
  { id: "braga-bridge", name: "Braga Bridge", detail: "I-195 over the Taunton River", lat: 41.7047, lon: -71.1569 },
  { id: "whaling-museum", name: "Whaling Museum", detail: "Johnny Cake Hill, New Bedford", lat: 41.6355, lon: -70.9233 },
  { id: "marciano", name: "Rocky Marciano statue", detail: "Downtown Brockton", lat: 42.0836, lon: -71.0186 },
  { id: "bourne-bridge", name: "Bourne Bridge", detail: "Cape Cod Canal", lat: 41.7476, lon: -70.5902 },
  { id: "sagamore-bridge", name: "Sagamore Bridge", detail: "Cape Cod Canal", lat: 41.7746, lon: -70.5428 },
  { id: "provincetown", name: "Provincetown", detail: "MacMillan Wharf", lat: 42.0519, lon: -70.1856 },
];

const KEY = "mh.discovery.v1";
export const DISCOVERY_RADIUS_M = 90;

const found = new Set<string>();
let loaded = false;

function persist(): void {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify([...found])); } catch { /* private mode */ }
}

function ensure(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return;
    const ids = JSON.parse(raw) as unknown;
    if (Array.isArray(ids)) for (const id of ids) if (typeof id === "string") found.add(id);
  } catch { /* ignore a bad save */ }
}

export function resetDiscovery(): void {
  found.clear();
  loaded = true;
  persist();
}

export function discoveryFound(): string[] {
  ensure();
  return DISCOVERY.filter((pin) => found.has(pin.id)).map((pin) => pin.id);
}

export function metersBetween(a: LatLon, b: LatLon): number {
  const d = latLonToLocal(a, b);
  return Math.hypot(d.x, d.z);
}

/** Mark every pin inside the radius. Returns the names found on this call. */
export function noteDiscovery(lat: number, lon: number, radius = DISCOVERY_RADIUS_M): string[] {
  ensure();
  const here = { lat, lon };
  const fresh: string[] = [];
  for (const pin of DISCOVERY) {
    if (found.has(pin.id)) continue;
    if (metersBetween(here, pin) > radius) continue;
    found.add(pin.id);
    fresh.push(pin.name);
  }
  if (fresh.length) persist();
  return fresh;
}
