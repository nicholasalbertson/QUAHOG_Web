/**
 * §16.1–16.2 Externalize player-facing strings + key lint.
 */

export const STRINGS: Record<string, string> = {
  "hud.health": "Health",
  "hud.wanted": "Wanted",
  "hud.cash": "Cash",
  "menu.pause": "Paused",
  "menu.continue": "Continue",
  "menu.newGame": "New Game",
  "mission.objective": "Objective",
  "tutorial.move": "Move with the stick or WASD.",
};

export function t(key: string, catalog: Record<string, string> = STRINGS): string {
  return catalog[key] ?? `MISSING:${key}`;
}

export function unusedKeys(catalog: Record<string, string>, used: string[]): string[] {
  const set = new Set(used);
  return Object.keys(catalog).filter((k) => !set.has(k));
}
