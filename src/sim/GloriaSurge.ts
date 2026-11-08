/**
 * §7.4.2 Storm-surge "Gloria" event.
 */

export interface GloriaState {
  active: boolean;
  intensity: number; // 0..1
  waterRise: number; // metres
  frictionMul: number;
}

export function createGloria(): GloriaState {
  return { active: false, intensity: 0, waterRise: 0, frictionMul: 1 };
}

export function startGloria(s: GloriaState, intensity = 0.8): void {
  s.active = true;
  s.intensity = Math.max(0, Math.min(1, intensity));
  s.waterRise = 1.2 + s.intensity * 2.5;
  s.frictionMul = 0.55 - s.intensity * 0.15;
}

export function endGloria(s: GloriaState): void {
  s.active = false;
  s.intensity = 0;
  s.waterRise = 0;
  s.frictionMul = 1;
}

export function stepGloria(s: GloriaState, dt: number, fading = false): void {
  if (!s.active) return;
  if (fading) {
    s.intensity = Math.max(0, s.intensity - dt * 0.05);
    if (s.intensity <= 0.01) endGloria(s);
    else {
      s.waterRise = 1.2 + s.intensity * 2.5;
      s.frictionMul = 0.55 - s.intensity * 0.15;
    }
  }
}
