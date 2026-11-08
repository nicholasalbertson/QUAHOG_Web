/**
 * §6.4 Collectible set progress + one-shot rewards.
 */

export interface CollectibleSet {
  id: string;
  name: string;
  total: number;
  reward: { cash?: number; unlock?: string };
}

export const COLLECTIBLE_SETS: CollectibleSet[] = [
  {
    id: "scrimshaw",
    name: "Whaling Scrimshaw",
    total: 8,
    reward: { cash: 1500, unlock: "scrimshaw-boat" },
  },
];

export interface SetProgress {
  found: number;
  rewarded: boolean;
}

export function progressFor(found: number, set: CollectibleSet): SetProgress {
  return { found: Math.min(found, set.total), rewarded: false };
}

/** Grant reward exactly once when set completes. */
export function claimSetReward(
  set: CollectibleSet,
  found: number,
  alreadyRewarded: boolean,
): { grant: boolean; cash: number; unlock?: string } {
  if (alreadyRewarded || found < set.total) {
    return { grant: false, cash: 0 };
  }
  return {
    grant: true,
    cash: set.reward.cash ?? 0,
    unlock: set.reward.unlock,
  };
}

/** §6.4.2 Map progress row for big-map / HUD. */
export function mapProgressRows(
  foundBySet: Record<string, number>,
  rewarded: Record<string, boolean> = {},
): { id: string; name: string; found: number; total: number; rewardLabel: string }[] {
  return COLLECTIBLE_SETS.map((set) => {
    const found = Math.min(foundBySet[set.id] ?? 0, set.total);
    const claim = claimSetReward(set, found, !!rewarded[set.id]);
    const rewardLabel = claim.unlock
      ? `Unlock ${claim.unlock}`
      : claim.cash > 0
        ? `$${claim.cash}`
        : set.reward.unlock
          ? `Unlock ${set.reward.unlock}`
          : `$${set.reward.cash ?? 0}`;
    return { id: set.id, name: set.name, found, total: set.total, rewardLabel };
  });
}
