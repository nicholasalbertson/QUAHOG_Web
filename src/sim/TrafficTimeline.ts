/**
 * §14.4.3 Traffic density/lighting timeline editor.
 */

export interface TrafficKeyframe {
  hour: number;
  density: number; // 0..1
  streetlight: number; // 0..1
}

export function sampleTraffic(keys: TrafficKeyframe[], hour: number): TrafficKeyframe {
  if (!keys.length) return { hour, density: 0.4, streetlight: hour < 6 || hour > 19 ? 1 : 0 };
  const sorted = [...keys].sort((a, b) => a.hour - b.hour);
  let cur = sorted[0]!;
  for (const k of sorted) if (k.hour <= hour) cur = k;
  return { ...cur, hour };
}
