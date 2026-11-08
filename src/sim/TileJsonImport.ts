/**
 * §14.7.4 Tile import from JSON → streamer-ready.
 */

import { tilesFromManifest, type StreamTile } from "./StreamerTiles";
import type { WorldManifest } from "./WorldManifest";
import { migrateManifest } from "./ManifestMigrate";
import { validateManifestDeep } from "./ManifestSchema";

export function importTilesFromJson(raw: unknown, tileSize = 256): { ok: boolean; tiles: StreamTile[]; errors: string[] } {
  try {
    const mig = migrateManifest(raw);
    const deep = validateManifestDeep(mig.manifest);
    if (!deep.ok) return { ok: false, tiles: [], errors: deep.errors };
    return { ok: true, tiles: tilesFromManifest(mig.manifest as WorldManifest, tileSize), errors: [] };
  } catch (e) {
    return { ok: false, tiles: [], errors: [e instanceof Error ? e.message : String(e)] };
  }
}
