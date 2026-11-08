/**
 * §13.7.1 Single coord helper module — world XZ + OSM EN conversion.
 */

/** Slice east/north → world x/z (z = -north). */
export function enToWorld(e: number, n: number): { x: number; z: number } {
  return { x: e, z: -n };
}

export function worldToEn(x: number, z: number): { e: number; n: number } {
  return { e: x, n: -z };
}

export function distXZ(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

export function lerpXZ(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  t: number,
): { x: number; z: number } {
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t };
}
