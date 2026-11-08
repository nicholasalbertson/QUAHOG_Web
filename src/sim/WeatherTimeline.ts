/**
 * §14.5 Visual timeline for clock/weather keyframes.
 */

export interface WeatherKeyframe {
  hour: number;
  weather: string;
  wetness: number;
}

export interface WeatherSchedule {
  day: number;
  keys: WeatherKeyframe[];
}

export function sampleSchedule(s: WeatherSchedule, hour: number): WeatherKeyframe {
  if (!s.keys.length) return { hour, weather: "clear", wetness: 0 };
  const sorted = [...s.keys].sort((a, b) => a.hour - b.hour);
  let cur = sorted[0]!;
  for (const k of sorted) {
    if (k.hour <= hour) cur = k;
  }
  return { ...cur, hour };
}

export function frictionFromWetness(wetness: number): number {
  return Math.max(0.35, 1 - wetness * 0.45);
}
