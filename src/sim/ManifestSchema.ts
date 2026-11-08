/**
 * §1.6.1 Manifest JSON Schema (lightweight runtime) + lint.
 */

import type { WorldManifest } from "./WorldManifest";
import { validateManifest } from "./WorldManifest";

export interface ManifestLintIssue {
  path: string;
  message: string;
}

/** §1.6.3 Lint dangling refs / duplicate ids. */
export function lintManifest(m: WorldManifest): ManifestLintIssue[] {
  const issues: ManifestLintIssue[] = [];
  const ids = new Set<string>();
  const take = (id: string, path: string) => {
    if (!id) {
      issues.push({ path, message: "missing id" });
      return;
    }
    if (ids.has(id)) issues.push({ path, message: `duplicate id ${id}` });
    ids.add(id);
  };

  m.markers.forEach((mk, i) => take(mk.id, `markers[${i}]`));
  m.spawns.forEach((s, i) => take(s.id, `spawns[${i}]`));
  m.doors.forEach((d, i) => take(d.id, `doors[${i}]`));
  m.signals.forEach((s, i) => take(s.id, `signals[${i}]`));
  m.fronts.forEach((f, i) => take(f.id, `fronts[${i}]`));
  m.collectibles.forEach((c, i) => take(c.id, `collectibles[${i}]`));
  m.raceTracks.forEach((r, i) => take(r.id, `raceTracks[${i}]`));

  for (const f of m.fronts) {
    if (!(f.cost >= 0)) issues.push({ path: `fronts:${f.id}`, message: "cost must be ≥ 0" });
  }

  // §1.6.7 Referential integrity — every marker/collectible/front resolves in a zone.
  const zones = m.zones ?? [];
  const inAnyZone = (x: number, z: number) =>
    zones.length === 0 ||
    zones.some((z0) => x >= z0.bounds.minX && x <= z0.bounds.maxX && z >= z0.bounds.minZ && z <= z0.bounds.maxZ);

  for (const mk of m.markers) {
    if (!Number.isFinite(mk.x) || !Number.isFinite(mk.z)) {
      issues.push({ path: `markers:${mk.id}`, message: "non-finite position" });
    } else if (!inAnyZone(mk.x, mk.z)) {
      issues.push({ path: `markers:${mk.id}`, message: "outside all zones" });
    }
  }
  for (const c of m.collectibles) {
    if (!Number.isFinite(c.x) || !Number.isFinite(c.z)) {
      issues.push({ path: `collectibles:${c.id}`, message: "non-finite position" });
    } else if (!inAnyZone(c.x, c.z)) {
      issues.push({ path: `collectibles:${c.id}`, message: "outside all zones" });
    }
  }
  for (const f of m.fronts) {
    if (!Number.isFinite(f.x) || !Number.isFinite(f.z)) {
      issues.push({ path: `fronts:${f.id}`, message: "non-finite position" });
    } else if (!inAnyZone(f.x, f.z)) {
      issues.push({ path: `fronts:${f.id}`, message: "outside all zones" });
    }
  }
  return issues;
}

export function validateManifestDeep(raw: unknown): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  lint: ManifestLintIssue[];
} {
  const base = validateManifest(raw);
  if (!base.ok) return { ...base, lint: [] };
  const lint = lintManifest(raw as WorldManifest);
  const errors = [...base.errors, ...lint.filter((l) => l.message.startsWith("duplicate") || l.message === "missing id").map((l) => `${l.path}: ${l.message}`)];
  const warnings = [...base.warnings, ...lint.filter((l) => !errors.includes(`${l.path}: ${l.message}`)).map((l) => `${l.path}: ${l.message}`)];
  return { ok: errors.length === 0, errors, warnings, lint };
}

export function manifestStats(m: WorldManifest): Record<string, number> {
  return {
    zones: m.zones.length,
    roads: m.roads.length,
    landmarks: m.landmarks.length,
    markers: m.markers.length,
    spawns: m.spawns.length,
    doors: m.doors.length,
    signals: m.signals.length,
    fronts: m.fronts.length,
    collectibles: m.collectibles.length,
    raceTracks: m.raceTracks.length,
    territories: m.territories.length,
  };
}
