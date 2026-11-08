/**
 * §16.1 — Player-facing string catalog (en-US source of truth).
 *
 * All user-visible UI copy lives here so it can be audited, linted, and
 * translated without hunting string literals through components. Values are
 * the strings as currently displayed — this file externalizes them, it does
 * not reword or rebrand them.
 *
 * Scope (2026-11-07): StartMenu + HUD chrome are wired through this catalog.
 * Mission titles/objectives live in src/mission.ts (already centralized data,
 * not UI literals) and are NOT duplicated here. Toasts/prompts wired by
 * their owning components as they are externalized; the catalog grows by
 * section, never by copying a string into two places.
 *
 * §16.1 status (2026-11-08): StartMenu + HUD are FULLY externalized —
 * every hardcoded UI string in src/ui/StartMenu.tsx and src/HUD.tsx now
 * resolves through t()/tf() (see src/__tests__/i18n.test.ts). Remaining
 * hardcoded surfaces (PauseMenu, Toasts, radio copy) live in files owned by
 * other components and are NOT in this catalog yet — externalize them when
 * those components are touched, per the "by section as touched" rule.
 * Weapon/melee names ("bat", weapon state) are game data, not UI copy —
 * they are NOT duplicated here (same rule as mission titles in mission.ts).
 * No locale beyond en-US (checklist §16.1); do not add a locale without
 * real translations — a missing locale is marked missing, never guessed.
 *
 * Conventions (§16.2): keys are dot-paths `section.element`; `t()` is the
 * single accessor so a future locale lookup can replace the identity
 * implementation without touching call sites. Placeholders use {name}.
 */
export const STRINGS = {
  common: {
    southcoast: "SOUTHCOAST",
    loading: "LOADING…",
    continue: "CONTINUE",
    newGame: "NEW GAME",
    newGameSave: "✦ NEW GAME",
  },
  menu: {
    eyebrow: "SOUTHCOAST · 2026",
    // Displayed title. DECIDED 2026-11-08 (Nic, option c, D1): "Mount Hope:
    // The Narrows". Supersedes the legacy alias "THE NARROWS". Canonical
    // brand per src/registries.ts BRAND.name is "Mount Hope".
    title: "Mount Hope: The Narrows",
    subtitle: "New Bedford · Fall River · the Narrows",
    photoreal: "🛰 PHOTOREAL MODE (3D TILES)",
    continueUnavailable: "Continue unavailable · missing stats",
    loadingDistrict: "LOADING NEW BEDFORD",
    tips: [
      "WASD to move · Shift to sprint · E to grab a car.",
      "G draws your pistol — click to fire. F throws hands. R reloads.",
      "Heat climbs when you cause trouble. Lay low at the safehouse.",
      "Ram a car to stop it, then jack it on foot with E.",
      "Press M for the map, C for your character, ⚙ to lay out touch controls.",
      "Buy fronts around the city (B) — they pay out every day.",
      "FPS soak: open with ?debug&soak=1&perf=1 and drive the NB ring 30 min.",
    ] as const,
    tip: "TIP: {tip}",
    footer:
      "Map data © OpenStreetMap contributors, ODbL · Imagery © Esri, Maxar, Earthstar Geographics · An original work",
  },
  hud: {
    photoMode: "Photo mode · O to return",
    wasted: "WASTED",
    busted: "BUSTED",
    missionComplete: "MISSION COMPLETE",
    openMenu: "Open game menu",
    health: "Health",
    stamina: "Stamina {n} percent",
    policeHeat: "Police heat {n}",
    factionHeat: "Faction heat {n}",
    fronts: "{owned}/{total} fronts",
    scrimshaw: "{found}/{total} scrimshaw",
    keyboardControls: "Keyboard controls",
    enterVehicle: "Enter vehicle",
    useCarControlTouch: "Use the CAR control on touch",
    buyFront: "Buy front",
    expandHud: "Expand HUD",
    compactHud: "Use compact HUD",
    less: "Less",
    more: "More",
    map: "Map",
    player: "Player",
    radio: "Radio",
    objectiveOffScreen: "Objective off-screen",
    // §16.1 (2026-11-08) — remaining HUD copy externalized. All values are
    // the strings as displayed; this catalog externalizes them, it does not
    // reword them. Units (m, MPH) and compass points are catalog values so
    // a future locale can render them correctly.
    currentObjective: "Current objective",
    gamePanels: "Game panels",
    blizzard: "Blizzard of ’26 · 52-inch drifts",
    wrongWay: "⚠ WRONG WAY — the objective is behind you",
    waypoint: "Waypoint",
    distance: "{dist} m",
    speedUnit: "MPH",
    mapCredit: "Map © OpenStreetMap · ODbL",
    day: "Day {day}",
    // "$" is a literal currency symbol; {amount} is the tf() placeholder.
    perDay: "+${amount}/day",
    compassN: "N",
    compassNE: "NE",
    compassE: "E",
    compassSE: "SE",
    compassS: "S",
    compassSW: "SW",
    compassW: "W",
    compassNW: "NW",
    helpMove: "move",
    helpSprint: "sprint",
    helpEnterExit: "enter/exit",
    helpBrake: "brake",
    helpMelee: "melee",
    helpDraw: "draw",
    helpClickFire: "click fire",
    helpView: "view",
    helpHorn: "horn",
    helpMap: "map",
    helpCharacter: "character",
    helpWeather: "weather",
    helpRadio: "radio",
    helpWeapons: "weapons",
    helpPhoto: "photo",
  },
} as const;

export type StringKey = keyof typeof STRINGS.common | keyof typeof STRINGS.menu | keyof typeof STRINGS.hud;

/** Single accessor for UI copy. Identity for en-US today; the lookup point for future locales (§16). */
export function t(section: "common", key: keyof typeof STRINGS.common): string;
export function t(section: "menu", key: keyof typeof STRINGS.menu): string;
export function t(section: "hud", key: keyof typeof STRINGS.hud): string;
export function t(section: keyof typeof STRINGS, key: string): string {
  const table = STRINGS[section] as Record<string, string | readonly string[]>;
  const v = table[key];
  if (typeof v === "string") return v;
  throw new Error(`[i18n] missing string ${section}.${key}`);
}

/** Fill {name} placeholders. */
export function tf(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
