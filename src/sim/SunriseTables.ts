/**
 * §1.4.2–3 Season sunrise/sunset + sun/moon lighting uniforms.
 */

export type Season = "winter" | "spring" | "summer" | "fall";

export interface SunMoonUniforms {
  sunDir: [number, number, number];
  sunColor: [number, number, number];
  moonDir: [number, number, number];
  moonColor: [number, number, number];
  nightFactor: number;
}

/** Approximate South Coast rise/set hours by season. */
export const SUNRISE_TABLE: Record<Season, { rise: number; set: number }> = {
  winter: { rise: 7.1, set: 16.4 },
  spring: { rise: 6.2, set: 19.0 },
  summer: { rise: 5.3, set: 20.2 },
  fall: { rise: 6.5, set: 17.6 },
};

export function seasonForDay(day: number): Season {
  const d = ((Math.floor(day) % 365) + 365) % 365;
  if (d < 80) return "winter";
  if (d < 172) return "spring";
  if (d < 266) return "summer";
  if (d < 355) return "fall";
  return "winter";
}

export function nightFactorFor(hour: number, season: Season): number {
  const { rise, set } = SUNRISE_TABLE[season];
  if (hour >= rise && hour <= set) {
    const mid = (rise + set) / 2;
    const span = (set - rise) / 2;
    const u = 1 - Math.abs(hour - mid) / span;
    return Math.max(0, 1 - u);
  }
  return 1;
}

/** Unit direction + RGB for sun/moon given hour. */
export function sunMoonUniforms(hour: number, season: Season = "summer"): SunMoonUniforms {
  const { rise, set } = SUNRISE_TABLE[season];
  const dayLen = Math.max(0.1, set - rise);
  const u = (hour - rise) / dayLen; // 0 at rise, 1 at set
  const elev = Math.sin(Math.max(0, Math.min(1, u)) * Math.PI); // 0..1..0
  const az = (hour / 24) * Math.PI * 2;
  const sunDir: [number, number, number] = [
    Math.sin(az) * Math.max(0.05, elev),
    Math.max(0.02, elev),
    -Math.cos(az) * Math.max(0.05, elev),
  ];
  const warm = hour < rise + 1 || hour > set - 1;
  const sunColor: [number, number, number] = warm
    ? [1.0, 0.55, 0.35]
    : [1.0, 0.95, 0.85];
  const moonDir: [number, number, number] = [-sunDir[0], Math.max(0.1, 1 - elev), -sunDir[2]];
  const night = nightFactorFor(hour, season);
  const moonColor: [number, number, number] = [0.55, 0.62, 0.78];
  return { sunDir, sunColor, moonDir, moonColor, nightFactor: night };
}
