/**
 * §2.2.3 Resume fast-path: single step, no catch-up after hide/idle.
 */

export interface ResumePolicy {
  /** Max accumulator seconds allowed on resume (discard excess). */
  maxCatchUpSec: number;
  /** Prefer a single fixed step after resume. */
  singleStep: boolean;
}

export const DEFAULT_RESUME: ResumePolicy = {
  maxCatchUpSec: 1 / 30,
  singleStep: true,
};

/** Clamp loop accumulator after visibility resume. */
export function clampAccumulator(accumSec: number, policy: ResumePolicy = DEFAULT_RESUME): number {
  if (!(accumSec > 0)) return 0;
  if (policy.singleStep) return Math.min(accumSec, policy.maxCatchUpSec);
  return Math.min(accumSec, policy.maxCatchUpSec * 3);
}
