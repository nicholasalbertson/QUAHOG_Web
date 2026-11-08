/**
 * §3.5.1 Wanted radar — unit blips relative to player.
 */

export interface RadarBlip {
  id: string;
  /** Angle degrees relative to player yaw (0 = forward). */
  angle: number;
  /** Distance metres. */
  dist: number;
  kind: "cop" | "heli" | "roadblock";
}

export function radarBlips(
  player: { x: number; z: number; yaw: number },
  units: { id: string; x: number; z: number; kind: RadarBlip["kind"] }[],
  maxDist = 180,
): RadarBlip[] {
  const out: RadarBlip[] = [];
  for (const u of units) {
    const dx = u.x - player.x;
    const dz = u.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > maxDist || dist < 0.01) continue;
    const bearing = Math.atan2(dx, dz);
    let delta = bearing - player.yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    out.push({
      id: u.id,
      angle: (delta * 180) / Math.PI,
      dist,
      kind: u.kind,
    });
  }
  out.sort((a, b) => a.dist - b.dist);
  return out;
}
