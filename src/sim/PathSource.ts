/**
 * §13.1 Single path source — RoadGraph + PedGraph; Signal FSM for lights.
 */

import type { RoadGraph } from "./RoadGraph";
import type { PedGraph } from "./PedGraph";
import type { SignalNetwork } from "./SignalFsm";

export interface PathSource {
  roads: RoadGraph;
  peds: PedGraph;
  signals: SignalNetwork | null;
}

export function assertSinglePathSource(src: PathSource): string[] {
  const errs: string[] = [];
  if (!src.roads) errs.push("missing RoadGraph");
  if (!src.peds) errs.push("missing PedGraph");
  // Signals optional until manifest bind; when present they own light state.
  return errs;
}
