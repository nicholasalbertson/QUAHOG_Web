/**
 * §8.4.5 Each trigger type fires exactly once in replay.
 */

import { evalTrigger, type Trigger, type TriggerEvalCtx } from "./Triggers";

export function fireOnceReplay(triggers: Trigger[], ctx: TriggerEvalCtx): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of triggers) {
    counts[t.kind] = counts[t.kind] ?? 0;
    if (evalTrigger(t, ctx)) counts[t.kind]!++;
    // Second eval should not re-fire fire-once triggers
    if (evalTrigger(t, ctx)) counts[t.kind]!++;
  }
  return counts;
}
