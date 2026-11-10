// Photoreal resume blob. Separate from the shared stylized position save:
// an earth session anchored at Brockton or the Cape is in that place's
// local frame, and writing those meters into the New Bedford world save
// would drop a stylized continue in the wrong city.

import { placeById } from "./regions";

export const EARTH_LOCAL_KEY = "mh.earthLocal.v1";

export interface EarthLocalSave {
  placeId: string;
  x: number;
  z: number;
  heading: number;
}

const MAX_OFFSET_M = 8000;

export function parseEarthLocal(raw: unknown): EarthLocalSave | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Partial<EarthLocalSave>;
  if (typeof rec.placeId !== "string" || !placeById(rec.placeId)) return null;
  if (typeof rec.x !== "number" || typeof rec.z !== "number") return null;
  if (!Number.isFinite(rec.x) || !Number.isFinite(rec.z)) return null;
  if (Math.hypot(rec.x, rec.z) > MAX_OFFSET_M) return null;
  const heading = typeof rec.heading === "number" && Number.isFinite(rec.heading) ? rec.heading : 0;
  return { placeId: rec.placeId, x: rec.x, z: rec.z, heading };
}

/** True when this place's local frame is the shared New Bedford world. */
export function sharesStylizedFrame(placeId: string): boolean {
  return placeById(placeId)?.sliceAligned === true;
}
