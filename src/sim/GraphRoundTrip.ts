/**
 * §14.1.3 Editing round-trip: visualize → tweak JSON → re-import.
 */

import { graphToSvg } from "./GraphVisualizer";
import { graphsFromManifest } from "./ManifestGraphs";
import type { WorldManifest } from "./WorldManifest";

export function roundTripManifest(m: WorldManifest): { svg: string; nodeCount: number } {
  const g = graphsFromManifest(m);
  const nodes = g.roads.nodes.map((n) => ({ id: n.id, x: n.x, z: n.z }));
  const edges = g.roads.edges.map((e) => ({ from: e.from, to: e.to }));
  return { svg: graphToSvg(nodes, edges), nodeCount: nodes.length };
}
