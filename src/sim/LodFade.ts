/**
 * §7.7 Distant LOD + dithered/faded transitions.
 */

export function lodLevel(distance: number, near = 40, mid = 120, far = 250): 0 | 1 | 2 | 3 {
  if (distance < near) return 0;
  if (distance < mid) return 1;
  if (distance < far) return 2;
  return 3;
}

/** 0..1 fade between LOD bands (dither factor). */
export function lodFade(distance: number, near = 40, mid = 120, far = 250): number {
  const bands = [near, mid, far];
  for (let i = 0; i < bands.length; i++) {
    const edge = bands[i]!;
    const width = edge * 0.15;
    if (distance > edge - width && distance < edge + width) {
      return (distance - (edge - width)) / (2 * width);
    }
  }
  return 0;
}
