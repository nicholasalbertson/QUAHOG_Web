/**
 * §2.1.4 NaN guards on transforms — assert + recover + telemetry.
 */

import { emitTelemetry } from "../telemetry/schema";

export function sanitizeNumber(n: number, fallback = 0, label = "num"): number {
  if (Number.isFinite(n)) return n;
  emitTelemetry("sim.nan.recover", { label, value: String(n) });
  return fallback;
}

export function sanitizeVec3(
  v: { x: number; y: number; z: number },
  fallback = { x: 0, y: 0, z: 0 },
  label = "vec3",
): { x: number; y: number; z: number } {
  const x = sanitizeNumber(v.x, fallback.x, label + ".x");
  const y = sanitizeNumber(v.y, fallback.y, label + ".y");
  const z = sanitizeNumber(v.z, fallback.z, label + ".z");
  return { x, y, z };
}

export function isFinitePose(v: { x: number; y?: number; z: number }): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.z) && (v.y === undefined || Number.isFinite(v.y));
}
