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
