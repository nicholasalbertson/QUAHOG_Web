/**
 * §7.5.3 Toggling fog changes visibility immediately.
 */

export interface FogState {
  enabled: boolean;
  density: number;
  visibility: number; // metres
}

export function createFog(enabled = false): FogState {
  return { enabled, density: enabled ? 0.02 : 0, visibility: enabled ? 80 : 2000 };
}

export function setFogEnabled(s: FogState, enabled: boolean): void {
  s.enabled = enabled;
  s.density = enabled ? 0.02 : 0;
  s.visibility = enabled ? 80 : 2000;
}

export function visibilityOf(s: FogState): number {
  return s.visibility;
}
