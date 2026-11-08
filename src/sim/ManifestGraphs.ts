/**
 * §1.6.4 Build step: manifest → RoadGraph + PedGraph + SpatialIndex seed.
 */

import type { WorldManifest } from "./WorldManifest";
import { RoadGraph } from "./RoadGraph";
import { PedGraph } from "./PedGraph";
import { SpatialIndex } from "./SpatialIndex";

export interface ManifestSpatialItem {
  id: string;
  kind: string;
}

export interface ManifestGraphs {
  roads: RoadGraph;
  peds: PedGraph;
  spatial: SpatialIndex<ManifestSpatialItem>;
}

/** Seed runtime graphs from a validated manifest. */
export function graphsFromManifest(m: WorldManifest): ManifestGraphs {
  const roads = m.roads?.length ? RoadGraph.fromRoads(m.roads) : new RoadGraph();
  const peds = new PedGraph();
  const spatial = new SpatialIndex<ManifestSpatialItem>();

  const put = (id: string, kind: string, x: number, z: number) => {
    spatial.insert({ id, kind }, x, z);
  };

  for (const mk of m.markers) put(mk.id, "marker", mk.x, mk.z);
  for (const c of m.collectibles) put(c.id, "collectible", c.x, c.z);
  for (const f of m.fronts) put(f.id, "front", f.x, f.z);
  for (const s of m.spawns) put(s.id, "spawn", s.x, s.z);
  for (const d of m.doors) put(d.id, "door", d.x, d.z);
  for (const sig of m.signals) put(sig.id, "signal", sig.x, sig.z);

  return { roads, peds, spatial };
}
