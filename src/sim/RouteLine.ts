/**
 * §10.2.4 Route line parity with minimap.
 */

export interface RoutePoint {
  x: number;
  z: number;
}

export function routeLineFromPath(points: RoutePoint[] | null | undefined): RoutePoint[] {
  if (!points || points.length < 2) return [];
  return points.map((p) => ({ x: p.x, z: p.z }));
}

export function routeLength(points: RoutePoint[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z);
  }
  return len;
}
