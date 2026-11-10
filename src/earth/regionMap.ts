// Pure map math for the photoreal chart: project the South Coast, find the
// place or road under the player, and frame the whole region. Drawing lives
// in EarthMap.tsx; everything here is testable without a canvas.

import {
  distancePointToSegment,
  latLonToLocal,
  type LatLon,
  METERS_PER_DEG_LAT,
  metersPerDegLon,
  sliceToFrame,
} from "./geo";
import { HIGHWAYS, PLACES, regionName, type Place } from "./regions";

export interface MapView {
  lat: number;
  lon: number;
  /** Pixels per meter. */
  ppm: number;
}

export interface MapRoad {
  name: string | null;
  highway: string;
  points: [number, number][];
}

export interface LocationLabel {
  title: string;
  detail: string;
}

const MAJOR = new Set([
  "motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary",
]);

export function isMajorRoad(highway: string): boolean {
  return MAJOR.has(highway);
}

export function project(view: MapView, lat: number, lon: number, width: number, height: number): { x: number; y: number } {
  const east = (lon - view.lon) * metersPerDegLon(view.lat);
  const north = (lat - view.lat) * METERS_PER_DEG_LAT;
  return { x: width / 2 + east * view.ppm, y: height / 2 - north * view.ppm };
}

export function unproject(view: MapView, x: number, y: number, width: number, height: number): LatLon {
  const east = (x - width / 2) / view.ppm;
  const north = -(y - height / 2) / view.ppm;
  return {
    lat: view.lat + north / METERS_PER_DEG_LAT,
    lon: view.lon + east / metersPerDegLon(view.lat),
  };
}

export function frameSouthCoast(width: number, height: number, pad = 56): MapView {
  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;
  const consider = (lat: number, lon: number) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  };
  for (const p of PLACES) consider(p.lat, p.lon);
  for (const hw of HIGHWAYS) for (const pt of hw.points) consider(pt.lat, pt.lon);
  const lat = (minLat + maxLat) / 2;
  const lon = (minLon + maxLon) / 2;
  const heightM = Math.max(1, (maxLat - minLat) * METERS_PER_DEG_LAT);
  const widthM = Math.max(1, (maxLon - minLon) * metersPerDegLon(lat));
  const ppm = Math.min((width - pad * 2) / widthM, (height - pad * 2) / heightM);
  return { lat, lon, ppm: Math.max(0.002, ppm) };
}

export function panView(view: MapView, dxPx: number, dyPx: number): MapView {
  const east = -dxPx / view.ppm;
  const north = dyPx / view.ppm;
  return {
    ...view,
    lat: view.lat + north / METERS_PER_DEG_LAT,
    lon: view.lon + east / metersPerDegLon(view.lat),
  };
}

export function zoomView(
  view: MapView,
  factor: number,
  anchor?: { x: number; y: number; width: number; height: number },
): MapView {
  const ppm = Math.min(1.6, Math.max(0.0025, view.ppm * factor));
  if (!anchor) return { ...view, ppm };
  const before = unproject(view, anchor.x, anchor.y, anchor.width, anchor.height);
  // Keep the geographic point under the cursor fixed. Longitude scale depends
  // on the new center latitude, so solve that latitude first.
  const north = -(anchor.y - anchor.height / 2) / ppm;
  const east = (anchor.x - anchor.width / 2) / ppm;
  const lat = before.lat - north / METERS_PER_DEG_LAT;
  const lon = before.lon - east / metersPerDegLon(lat);
  return { lat, lon, ppm };
}

export function placeAtScreen(
  view: MapView,
  width: number,
  height: number,
  sx: number,
  sy: number,
  maxPx = 18,
): Place | null {
  let best: Place | null = null;
  let bestD = maxPx;
  for (const p of PLACES) {
    const q = project(view, p.lat, p.lon, width, height);
    const d = Math.hypot(q.x - sx, q.y - sy);
    if (d <= bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export interface NearbyPlace {
  place: Place;
  x: number;
  z: number;
  distance: number;
}

export function placesNear(anchor: LatLon, x: number, z: number, range: number): NearbyPlace[] {
  const out: NearbyPlace[] = [];
  for (const place of PLACES) {
    const local = latLonToLocal(anchor, place);
    const distance = Math.hypot(local.x - x, local.z - z);
    if (distance <= range) out.push({ place, x: local.x, z: local.z, distance });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out;
}

interface RoadHit {
  name: string;
  distance: number;
}

function nearestHighway(anchor: LatLon, x: number, z: number): RoadHit | null {
  let best: RoadHit | null = null;
  for (const hw of HIGHWAYS) {
    for (let i = 0; i < hw.points.length - 1; i++) {
      const a = latLonToLocal(anchor, hw.points[i]);
      const b = latLonToLocal(anchor, hw.points[i + 1]);
      const distance = distancePointToSegment(x, z, a.x, a.z, b.x, b.z);
      if (!best || distance < best.distance) best = { name: hw.name, distance };
    }
  }
  return best;
}

function nearestNamedStreet(
  anchor: LatLon,
  x: number,
  z: number,
  roads: readonly MapRoad[] | null | undefined,
  aligned: boolean,
): RoadHit | null {
  if (!roads) return null;
  let best: RoadHit | null = null;
  for (const road of roads) {
    if (!road.name || road.points.length < 2) continue;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = sliceToFrame(anchor, road.points[i][0], road.points[i][1], aligned);
      const b = sliceToFrame(anchor, road.points[i + 1][0], road.points[i + 1][1], aligned);
      // Skip segments that cannot possibly be the street underfoot.
      if (Math.abs(a.x - x) > 80 && Math.abs(b.x - x) > 80) continue;
      if (Math.abs(a.z - z) > 80 && Math.abs(b.z - z) > 80) continue;
      const distance = distancePointToSegment(x, z, a.x, a.z, b.x, b.z);
      if (distance > 36) continue;
      if (!best || distance < best.distance) best = { name: road.name, distance };
    }
  }
  return best;
}

/**
 * What the HUD and the minimap caption should say.
 * A named OSM street underfoot wins, then a highway you're actually on,
 * then the nearest real place.
 */
export function describeLocation(
  anchor: LatLon,
  x: number,
  z: number,
  roads?: readonly MapRoad[] | null,
  aligned = false,
): LocationLabel {
  const near = placesNear(anchor, x, z, 1e9)[0];
  const street = nearestNamedStreet(anchor, x, z, roads, aligned);
  const highway = nearestHighway(anchor, x, z);
  const placeTitle = near?.place.name ?? "South Coast";
  const placeDetail = near ? regionName(near.place.region) : "Massachusetts";

  if (street && street.distance < 32) {
    return { title: street.name, detail: `${placeTitle} · ${placeDetail}` };
  }
  const onHighway = highway
    && highway.distance < 90
    && (!near || highway.distance + 40 < near.distance);
  if (onHighway && highway) {
    return { title: highway.name, detail: placeDetail };
  }
  return { title: placeTitle, detail: near ? `${near.place.detail} · ${placeDetail}` : placeDetail };
}

export interface LocalSeg {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  major: boolean;
  name: string | null;
}

/** Road segments close enough to draw on the minimap. */
export function roadSegmentsNear(
  roads: readonly MapRoad[],
  anchor: LatLon,
  x: number,
  z: number,
  range: number,
  aligned: boolean,
): LocalSeg[] {
  const out: LocalSeg[] = [];
  const reach = range + 40;
  for (const road of roads) {
    const major = isMajorRoad(road.highway);
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = sliceToFrame(anchor, road.points[i][0], road.points[i][1], aligned);
      const b = sliceToFrame(anchor, road.points[i + 1][0], road.points[i + 1][1], aligned);
      if (Math.hypot(a.x - x, a.z - z) > reach && Math.hypot(b.x - x, b.z - z) > reach) continue;
      out.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, major, name: road.name });
      if (out.length >= 700) return out;
    }
  }
  return out;
}
