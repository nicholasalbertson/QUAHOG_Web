/**
 * §4.1.5 Ownership reflected in world (signage, unlocked doors).
 */

export interface OwnedFront {
  id: string;
  owned: boolean;
  unlocked: boolean;
  signage: string;
}

export function ownershipSignage(
  fronts: { id: string; name: string }[],
  ownedIds: Iterable<string>,
): OwnedFront[] {
  const set = new Set(ownedIds);
  return fronts.map((f) => {
    const owned = set.has(f.id);
    return {
      id: f.id,
      owned,
      unlocked: owned,
      signage: owned ? `${f.name} — YOURS` : f.name,
    };
  });
}
