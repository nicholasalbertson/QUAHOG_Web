// Local east/north frame for the photoreal build.
// x = east meters, z = -north meters, matching the rest of the game.
// The approximation is the same equirectangular scale the OSM slices use
// (111320 m/deg latitude). Longitude scale is taken at the anchor latitude.

export interface LatLon {
  lat: number;
  lon: number;
}

/** New Bedford slice origin. Every district slice in this repo is in this frame. */
export const SLICE_ORIGIN: LatLon = { lat: 41.636, lon: -70.9205 };

export const METERS_PER_DEG_LAT = 111_320;

export function metersPerDegLon(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Content-space offset of `point` from `anchor`. */
export function latLonToLocal(anchor: LatLon, point: LatLon): { x: number; z: number } {
  const east = (point.lon - anchor.lon) * metersPerDegLon(anchor.lat);
  const north = (point.lat - anchor.lat) * METERS_PER_DEG_LAT;
  return { x: east, z: -north };
}

/** Inverse of latLonToLocal. */
export function localToLatLon(anchor: LatLon, x: number, z: number): LatLon {
  const north = -z;
  return {
    lat: anchor.lat + north / METERS_PER_DEG_LAT,
    lon: anchor.lon + x / metersPerDegLon(anchor.lat),
  };
}

/**
 * Content yaw for a compass bearing (0 = north, 90 = east).
 * Forward in this frame is (sin yaw, cos yaw) = (east, z), and z grows south,
 * so north is yaw = π.
 */
export function headingForBearing(bearingDeg: number): number {
  const rad = (bearingDeg * Math.PI) / 180;
  let yaw = Math.PI - rad;
  while (yaw > Math.PI) yaw -= Math.PI * 2;
  while (yaw < -Math.PI) yaw += Math.PI * 2;
  return yaw;
}

/** Slice east/north meters (NB origin) → lat/lon. */
export function sliceToLatLon(east: number, north: number): LatLon {
  return localToLatLon(SLICE_ORIGIN, east, -north);
}

/**
 * A slice point in the active ENU frame.
 * When the frame IS the slice origin, use the slice meters directly so the
 * player (who is simulated in that frame) lines up with the roads.
 */
export function sliceToFrame(
  anchor: LatLon,
  east: number,
  north: number,
  aligned: boolean,
): { x: number; z: number } {
  if (aligned) return { x: east, z: -north };
  return latLonToLocal(anchor, sliceToLatLon(east, north));
}

/** True when `anchor` is the New Bedford slice origin, within `epsilonM` meters. */
export function anchorIsSliceOrigin(anchor: LatLon, epsilonM = 40): boolean {
  const d = latLonToLocal(SLICE_ORIGIN, anchor);
  return Math.hypot(d.x, d.z) <= epsilonM;
}

/** Shortest distance from a point to a segment, in the same 2D units. */
export function distancePointToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const ab2 = abx * abx + abz * abz;
  const t = ab2 < 1e-8 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / ab2));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}
