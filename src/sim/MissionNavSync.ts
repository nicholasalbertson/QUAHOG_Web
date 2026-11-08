/**
 * §1.3.27 / §8.1.2 Sync ObjectiveNav goal from the active mission step target.
 */

import type { ObjectiveNav } from "./ObjectiveNav";

export interface MissionStepTarget {
  target?: [number, number, number] | null;
}

export function syncNavFromStep(
  nav: ObjectiveNav,
  step: MissionStepTarget | null | undefined,
): void {
  const t = step?.target;
  if (!t) {
    nav.clear();
    return;
  }
  nav.setGoal({ x: t[0], z: t[2] });
}
