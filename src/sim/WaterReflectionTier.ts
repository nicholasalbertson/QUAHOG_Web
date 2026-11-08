/**
 * §7.4.3 Stronger water reflections (tiered).
 */

export type WaterReflectionQuality = 0 | 1 | 2;

export interface WaterReflectionSettings {
  quality: WaterReflectionQuality;
  mirror: boolean;
  fresnel: number;
  updateHz: number;
}

export function waterReflectionForQuality(q: 0 | 1 | 2): WaterReflectionSettings {
  if (q === 0) return { quality: 0, mirror: false, fresnel: 0.2, updateHz: 0 };
  if (q === 1) return { quality: 1, mirror: true, fresnel: 0.35, updateHz: 15 };
  return { quality: 2, mirror: true, fresnel: 0.5, updateHz: 30 };
}
