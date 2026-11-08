/**
 * §14.4 Race editor (checkpoints, class, laps) + rubber-band curve.
 */

export interface RaceEdit {
  id: string;
  name: string;
  classLock: "car" | "boat" | "any";
  laps: number;
  checkpoints: { x: number; z: number }[];
  /** Rubber-band strength 0..1 vs lead gap. */
  rubberCurve: number[];
}

export function rubberBandRate(curve: number[], leadGap: number): number {
  if (!curve.length) return 1;
  const t = Math.max(0, Math.min(1, (leadGap + 1) / 2));
  const idx = Math.min(curve.length - 1, Math.floor(t * (curve.length - 1)));
  return curve[idx] ?? 1;
}

export function validateRaceEdit(r: RaceEdit): string[] {
  const errs: string[] = [];
  if (r.checkpoints.length < 2) errs.push("need ≥2 checkpoints");
  if (r.laps < 1) errs.push("laps ≥ 1");
  return errs;
}
