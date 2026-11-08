/**
 * §1.3.19 Trigger debug overlay state — volumes + armed/fired.
 */

import type { Trigger } from "./Triggers";

export interface TriggerDebugRow {
  id: string;
  kind: string;
  armed: boolean;
  fired: boolean;
  /** Optional AABB/sphere for draw. */
  bounds?: { x: number; z: number; r?: number; minX?: number; maxX?: number; minZ?: number; maxZ?: number };
}

export function triggerDebugRows(triggers: Trigger[]): TriggerDebugRow[] {
  return triggers.map((t) => {
    const row: TriggerDebugRow = {
      id: t.id,
      kind: t.kind,
      armed: t.armed !== false,
      fired: !!t.fired,
    };
    if (t.kind === "sphere") row.bounds = { x: t.x, z: t.z, r: t.r };
    if (t.kind === "aabb") row.bounds = { x: (t.minX + t.maxX) / 2, z: (t.minZ + t.maxZ) / 2, minX: t.minX, maxX: t.maxX, minZ: t.minZ, maxZ: t.maxZ };
    if (t.kind === "distance") row.bounds = { x: t.x, z: t.z, r: t.r };
    return row;
  });
}
