/**
 * §1.6.6 Hot reload in dev: rebuild graphs, keep player position + mission.
 */

import type { WorldManifest } from "./WorldManifest";
import { migrateManifest } from "./ManifestMigrate";
import { validateManifestDeep } from "./ManifestSchema";
import { graphsFromManifest, type ManifestGraphs } from "./ManifestGraphs";

export interface HotReloadPreserve {
  playerX: number;
  playerZ: number;
  missionStep?: number;
  missionId?: string | null;
}

export interface HotReloadResult {
  ok: boolean;
  errors: string[];
  graphs?: ManifestGraphs;
  preserve: HotReloadPreserve;
  version: number;
}

/** Apply a new manifest JSON while preserving player/mission pose. */
export function hotReloadManifest(
  raw: unknown,
  preserve: HotReloadPreserve,
): HotReloadResult {
  try {
    const migrated = migrateManifest(raw);
    const deep = validateManifestDeep(migrated.manifest);
    if (!deep.ok) {
      return { ok: false, errors: deep.errors, preserve, version: migrated.manifest.version };
    }
    const graphs = graphsFromManifest(migrated.manifest);
    return {
      ok: true,
      errors: [],
      graphs,
      preserve: { ...preserve },
      version: migrated.manifest.version,
    };
  } catch (e) {
    return {
      ok: false,
      errors: [e instanceof Error ? e.message : String(e)],
      preserve,
      version: 0,
    };
  }
}
