/**
 * §12.4.1 / §12.4.3 Code-splitting + deferred non-critical assets.
 */

export type FeatureId = "radio" | "heli" | "cutscenes" | "raceUi" | "editors";

const loaded = new Set<FeatureId>();

export function markFeatureLoaded(id: FeatureId): void {
  loaded.add(id);
}

export function isFeatureLoaded(id: FeatureId): boolean {
  return loaded.has(id);
}

/** Declare deferred asset groups for boot budget. */
export const DEFERRED_GROUPS: Record<string, string[]> = {
  audio: ["music/*", "radio/*"],
  glb: ["packs/pack0*/*.glb"],
  editors: ["hud-harness.html"],
};

export function bootCriticalOnly(): string[] {
  return ["slice", "player", "hud-core", "input"];
}
