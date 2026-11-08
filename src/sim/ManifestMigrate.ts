/**
 * §1.6.2 Manifest version + migration for authored-data changes.
 */

import type { WorldManifest } from "./WorldManifest";

export const MANIFEST_CURRENT_VERSION = 1;

export interface ManifestMigrationResult {
  manifest: WorldManifest;
  fromVersion: number;
  migrationsApplied: string[];
}

/** Migrate any older authored manifest blob up to MANIFEST_CURRENT_VERSION. */
export function migrateManifest(raw: unknown): ManifestMigrationResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("manifest: root must be object");
  }
  const m = { ...(raw as WorldManifest) };
  const from = typeof m.version === "number" ? m.version : 0;
  const applied: string[] = [];

  if (from < 1) {
    m.version = 1;
    m.zones ??= [];
    m.roads ??= [];
    m.landmarks ??= [];
    m.markers ??= [];
    m.spawns ??= [];
    m.doors ??= [];
    m.signals ??= [];
    m.raceTracks ??= [];
    m.collectibles ??= [];
    m.fronts ??= [];
    m.territories ??= [];
    m.name ??= "untitled";
    applied.push("v0→v1: ensure arrays + name");
  }

  if (m.version !== MANIFEST_CURRENT_VERSION) {
    m.version = MANIFEST_CURRENT_VERSION;
    applied.push(`clamp version → ${MANIFEST_CURRENT_VERSION}`);
  }

  return { manifest: m, fromVersion: from, migrationsApplied: applied };
}
