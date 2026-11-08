/**
 * §4.3.2–3 Ownership change ↔ mission availability.
 */

export interface FrontDef {
  id: string;
  unlockMission?: string;
}

/** Missions currently unlocked by owned fronts. */
export function missionsFromOwned(
  fronts: FrontDef[],
  ownedIds: Iterable<string>,
): string[] {
  const owned = new Set(ownedIds);
  const out: string[] = [];
  for (const f of fronts) {
    if (owned.has(f.id) && f.unlockMission) out.push(f.unlockMission);
  }
  return out;
}

/** Diff after buy/sell — which mission ids were added or removed. */
export function ownershipMissionDelta(
  fronts: FrontDef[],
  beforeOwned: string[],
  afterOwned: string[],
): { added: string[]; removed: string[] } {
  const a = new Set(missionsFromOwned(fronts, beforeOwned));
  const b = new Set(missionsFromOwned(fronts, afterOwned));
  return {
    added: [...b].filter((m) => !a.has(m)),
    removed: [...a].filter((m) => !b.has(m)),
  };
}

/** True when a mission tied to a sold front is no longer available. */
export function missionStillAvailable(
  fronts: FrontDef[],
  ownedIds: Iterable<string>,
  missionId: string,
): boolean {
  return missionsFromOwned(fronts, ownedIds).includes(missionId);
}
