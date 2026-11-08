// Compass (§2.5.2) — pure. The heading convention is atan2(x, z) in slice
// world coords, where world z = -north (so heading 0 faces +z = south).
// Returns the bearing in degrees clockwise from north + the cardinal label.
export function headingToBearing(heading: number): number {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const deg = (Math.atan2(fx, -fz) * 180) / Math.PI;
  return (deg + 360) % 360;
}

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function headingToCardinal(heading: number): string {
  const bearing = headingToBearing(heading);
  return CARDINALS[Math.round(bearing / 45) % 8];
}

export function headingToCompass(heading: number): { bearing: number; cardinal: string } {
  return { bearing: Math.round(headingToBearing(heading)), cardinal: headingToCardinal(heading) };
}
