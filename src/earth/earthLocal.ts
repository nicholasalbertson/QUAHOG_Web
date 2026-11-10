// Photoreal resume blob. Separate from the shared stylized position save:
// an earth session anchored at Brockton or the Cape is in that place's
// local frame, and writing those meters into the New Bedford world save
// would drop a stylized continue in the wrong city.

import { placeById } from "./regions";
import { jobById } from "./jobs";

export const EARTH_LOCAL_KEY = "mh.earthLocal.v1";

export interface EarthLocalSave {
  placeId: string;
  x: number;
  z: number;
  heading: number;
  /** Live ENU anchor. Absent on phase-1 saves, which resume at the place pin. */
  lat?: number;
  lon?: number;
  /** Opening-arc step. Absent means step 0. */
  arcStep?: number;
  /** Active earth job. Absent on older saves. An unknown id is dropped, not rejected. */
  jobId?: string;
  jobStep?: number;
  jobsDone?: string[];
  jobLine?: number;
  jobClock?: number;
  jobCheckpoint?: number;
  careerSeconds?: number;
  careerMeters?: number;
  careerDrove?: boolean;
  careerRepairs?: number;
  heatSeen?: boolean;
}

const MAX_OFFSET_M = 8000;

function inCoast(lat: number, lon: number): boolean {
  return lat >= 40.5 && lat <= 43.2 && lon >= -72.2 && lon <= -69.5;
}

export function parseEarthLocal(raw: unknown): EarthLocalSave | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Partial<EarthLocalSave>;
  if (typeof rec.placeId !== "string" || !placeById(rec.placeId)) return null;
  if (typeof rec.x !== "number" || typeof rec.z !== "number") return null;
  if (!Number.isFinite(rec.x) || !Number.isFinite(rec.z)) return null;
  if (Math.hypot(rec.x, rec.z) > MAX_OFFSET_M) return null;
  const heading = typeof rec.heading === "number" && Number.isFinite(rec.heading) ? rec.heading : 0;
  const save: EarthLocalSave = { placeId: rec.placeId, x: rec.x, z: rec.z, heading };
  const hasLat = typeof rec.lat === "number";
  const hasLon = typeof rec.lon === "number";
  if (hasLat || hasLon) {
    if (!hasLat || !hasLon || !Number.isFinite(rec.lat!) || !Number.isFinite(rec.lon!)) return null;
    if (!inCoast(rec.lat!, rec.lon!)) return null;
    save.lat = rec.lat;
    save.lon = rec.lon;
  }
  if (typeof rec.arcStep === "number" && Number.isFinite(rec.arcStep) && rec.arcStep >= 0) {
    save.arcStep = Math.floor(rec.arcStep);
  }
  if (typeof rec.jobId === "string" && jobById(rec.jobId)) {
    save.jobId = rec.jobId;
    if (typeof rec.jobStep === "number" && Number.isFinite(rec.jobStep) && rec.jobStep >= 0) save.jobStep = Math.floor(rec.jobStep);
  }
  if (Array.isArray(rec.jobsDone)) {
    const ids = rec.jobsDone.filter((id): id is string => typeof id === "string" && !!jobById(id));
    if (ids.length) save.jobsDone = ids;
  }
  if (typeof rec.jobLine === "number" && rec.jobLine >= 0) save.jobLine = Math.floor(rec.jobLine);
  if (typeof rec.jobClock === "number" && rec.jobClock >= 0) save.jobClock = rec.jobClock;
  if (typeof rec.jobCheckpoint === "number" && rec.jobCheckpoint >= 0) save.jobCheckpoint = Math.floor(rec.jobCheckpoint);
  if (typeof rec.careerSeconds === "number" && rec.careerSeconds >= 0) save.careerSeconds = rec.careerSeconds;
  if (typeof rec.careerMeters === "number" && rec.careerMeters >= 0) save.careerMeters = rec.careerMeters;
  if (rec.careerDrove === true) save.careerDrove = true;
  if (typeof rec.careerRepairs === "number" && rec.careerRepairs >= 0) save.careerRepairs = Math.floor(rec.careerRepairs);
  if (rec.heatSeen === true) save.heatSeen = true;
  return save;
}

/** True when this place's local frame is the shared New Bedford world. */
export function sharesStylizedFrame(placeId: string): boolean {
  return placeById(placeId)?.sliceAligned === true;
}
