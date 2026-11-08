/**
 * §13.7.2 Package naming pass — canonical product name.
 */

export const PACKAGE_NAMES = {
  repo: "QUAHOG_Web",
  world: "Mount Hope",
  product: "The Narrows",
} as const;

export function displayName(): string {
  return PACKAGE_NAMES.product;
}

export function namingConsistent(samples: string[]): string[] {
  // Flag raw repo name leaking into player-facing strings.
  return samples.filter((s) => /\bQUAHOG_Web\b/.test(s) || /\bGTA\b/.test(s));
}
