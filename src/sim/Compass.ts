/**
 * §10.1.1 Compass — bearing to waypoint / north.
 */

export interface CompassReading {
  /** Degrees 0..360, 0 = north (+Z). */
  heading: number;
  /** Bearing to waypoint, or null. */
  waypointBearing: number | null;
  /** Shortest delta heading→waypoint (−180..180). */
  delta: number | null;
}

export function compassReading(
  yaw: number,
  waypoint: { x: number; z: number } | null,
  from: { x: number; z: number },
): CompassReading {
  const heading = ((yaw * 180) / Math.PI + 360) % 360;
  if (!waypoint) return { heading, waypointBearing: null, delta: null };
  const bearing = (Math.atan2(waypoint.x - from.x, waypoint.z - from.z) * 180) / Math.PI;
  const wb = (bearing + 360) % 360;
  let delta = wb - heading;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return { heading, waypointBearing: wb, delta };
}
