// Day/night sun position (§2.9.1) — pure. The sun follows the sim clock's
// hour: rises east at 06:00, overhead at noon, sets west at 18:00, below
// the horizon at midnight. Matches ClockWeather's elevation law
// (sin((hour-6)/12 * π)) so the Sky and the sim's nightFactor agree.
export function sunPositionForHour(hour: number): [number, number, number] {
  const t = ((hour - 6) / 12) * Math.PI;
  const el = Math.sin(t); // elevation sine: 0 at 06:00/18:00, 1 at noon, -1 at midnight
  const elevAngle = Math.asin(Math.max(-1, Math.min(1, el)));
  const horizontal = Math.cos(elevAngle);
  const az = t; // azimuth: 0 east at 06:00, π/2 south at noon, π west at 18:00
  const R = 100;
  return [horizontal * Math.cos(az) * R, el * R, horizontal * Math.sin(az) * R];
}

/** Sun light multiplier for the hour (0..1): full at noon, 0 at night.
 *  The caller keeps a small moonlight floor (see EarthApp). */
export function sunDayFactor(hour: number): number {
  return Math.max(0, Math.min(1, Math.sin(((hour - 6) / 12) * Math.PI)));
}
