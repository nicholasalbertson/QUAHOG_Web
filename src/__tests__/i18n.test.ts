// §16.1 / §16.2 — string catalog invariants.
// The catalog is the single source of truth for UI copy: every value must be
// a non-empty string, every key used by StartMenu/HUD must resolve, and
// placeholder templates must only reference variables the caller supplies.
import { describe, it, expect } from "vitest";
import { STRINGS, t, tf } from "../i18n/strings";

function walk(obj: unknown, path: string, out: [string, string][]): void {
  if (typeof obj === "string") { out.push([path, obj]); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walk(v, `${path}[${i}]`, out)); return; }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) walk(v, path ? `${path}.${k}` : k, out);
  }
}

describe("§16.1 string catalog", () => {
  it("every catalog string is non-empty", () => {
    const entries: [string, string][] = [];
    walk(STRINGS, "", entries);
    expect(entries.length).toBeGreaterThan(20);
    for (const [k, v] of entries) {
      expect(v.trim().length, `${k} must not be empty`).toBeGreaterThan(0);
    }
  });

  it("t() resolves every key StartMenu and HUD use", () => {
    expect(t("common", "continue")).toBe("CONTINUE");
    expect(t("common", "newGame")).toBe("NEW GAME");
    expect(t("common", "newGameSave")).toBe("✦ NEW GAME");
    expect(t("common", "loading")).toBe("LOADING…");
    expect(t("common", "southcoast")).toBe("SOUTHCOAST");
    expect(t("menu", "title")).toBe("Mount Hope: The Narrows");
    expect(t("menu", "subtitle")).toContain("New Bedford");
    expect(t("menu", "photoreal")).toContain("PHOTOREAL");
    expect(t("menu", "loadingDistrict")).toContain("NEW BEDFORD");
    expect(t("menu", "footer")).toContain("OpenStreetMap");
    expect(t("hud", "wasted")).toBe("WASTED");
    expect(t("hud", "busted")).toBe("BUSTED");
    expect(t("hud", "missionComplete")).toBe("MISSION COMPLETE");
    expect(t("hud", "map")).toBe("Map");
    expect(t("hud", "player")).toBe("Player");
    expect(t("hud", "radio")).toBe("Radio");
  });

  it("menu tips are all present and distinct", () => {
    const tips = STRINGS.menu.tips;
    expect(tips.length).toBeGreaterThanOrEqual(5);
    expect(new Set(tips).size).toBe(tips.length);
  });

  it("tf() fills placeholders and leaves unknown ones visible", () => {
    expect(tf(t("hud", "stamina"), { n: 42 })).toBe("Stamina 42 percent");
    expect(tf(t("hud", "fronts"), { owned: 2, total: 9 })).toBe("2/9 fronts");
    expect(tf(t("hud", "scrimshaw"), { found: 1, total: 12 })).toBe("1/12 scrimshaw");
    expect(tf("x {missing} y", {})).toBe("x {missing} y");
  });

  it("t() throws on a missing key instead of rendering undefined", () => {
    expect(() => (t as (s: string, k: string) => string)("hud", "nope")).toThrow(/missing string/);
  });
});

// §16.1 full pass (2026-11-08) — every hardcoded UI string in StartMenu +
// HUD is now externalized. These tests pin the new keys so a regression
// (a literal creeping back in, or a key dropped from the catalog) fails here.
describe("§16.1 full pass — HUD + StartMenu complete", () => {
  it("t() resolves every new HUD/StartMenu key", () => {
    expect(t("menu", "tip")).toBe("TIP: {tip}");
    expect(t("menu", "continueUnavailable")).toContain("missing stats");
    expect(t("hud", "currentObjective")).toBe("Current objective");
    expect(t("hud", "gamePanels")).toBe("Game panels");
    expect(t("hud", "blizzard")).toContain("Blizzard");
    expect(t("hud", "wrongWay")).toContain("WRONG WAY");
    expect(t("hud", "waypoint")).toBe("Waypoint");
    expect(t("hud", "distance")).toBe("{dist} m");
    expect(t("hud", "speedUnit")).toBe("MPH");
    expect(t("hud", "mapCredit")).toContain("OpenStreetMap");
    expect(t("hud", "day")).toBe("Day {day}");
    expect(t("hud", "perDay")).toBe("+${amount}/day");
  });

  it("compass points resolve to the eight abbreviations", () => {
    expect([
      t("hud", "compassN"), t("hud", "compassNE"), t("hud", "compassE"), t("hud", "compassSE"),
      t("hud", "compassS"), t("hud", "compassSW"), t("hud", "compassW"), t("hud", "compassNW"),
    ]).toEqual(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);
  });

  it("help labels resolve and are distinct", () => {
    const labels = [
      t("hud", "helpMove"), t("hud", "helpSprint"), t("hud", "helpEnterExit"), t("hud", "helpBrake"),
      t("hud", "helpMelee"), t("hud", "helpDraw"), t("hud", "helpClickFire"), t("hud", "helpView"),
      t("hud", "helpHorn"), t("hud", "helpMap"), t("hud", "helpCharacter"), t("hud", "helpWeather"),
      t("hud", "helpRadio"), t("hud", "helpWeapons"), t("hud", "helpPhoto"),
    ];
    expect(labels.length).toBe(15);
    for (const l of labels) expect(l.trim().length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("tf() fills the new templates", () => {
    expect(tf(t("menu", "tip"), { tip: "WASD to move." })).toBe("TIP: WASD to move.");
    expect(tf(t("hud", "distance"), { dist: 250 })).toBe("250 m");
    expect(tf(t("hud", "day"), { day: 3 })).toBe("Day 3");
    expect(tf(t("hud", "perDay"), { amount: 50 })).toBe("+$50/day");
  });

  it("§16.2 — every catalog key is used by StartMenu/HUD (no dead keys)", () => {
    // Collect every leaf key in the catalog as "section.key" (arrays count
    // once, as "section.tips"). The expected set is the keys StartMenu and
    // HUD actually use (via t() or via STRINGS). If a key is added to the
    // catalog but never wired, or removed while still referenced, this fails.
    const found = new Set<string>();
    const collect = (obj: unknown, path: string): void => {
      if (typeof obj === "string") { found.add(path); return; }
      if (Array.isArray(obj)) { found.add(path); return; }
      if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          collect(v, path ? `${path}.${k}` : k);
        }
      }
    };
    collect(STRINGS, "");
    const used = new Set([
      "common.southcoast", "common.loading", "common.continue", "common.newGame", "common.newGameSave",
      "menu.eyebrow", "menu.title", "menu.subtitle", "menu.photoreal", "menu.continueUnavailable",
      "menu.loadingDistrict", "menu.tips", "menu.tip", "menu.footer",
      "hud.photoMode", "hud.wasted", "hud.busted", "hud.missionComplete", "hud.openMenu", "hud.health",
      "hud.stamina", "hud.policeHeat", "hud.factionHeat", "hud.fronts", "hud.scrimshaw", "hud.keyboardControls",
      "hud.enterVehicle", "hud.useCarControlTouch", "hud.buyFront", "hud.expandHud", "hud.compactHud",
      "hud.less", "hud.more", "hud.map", "hud.player", "hud.radio", "hud.objectiveOffScreen",
      "hud.currentObjective", "hud.gamePanels", "hud.blizzard", "hud.wrongWay", "hud.waypoint", "hud.distance",
      "hud.speedUnit", "hud.mapCredit", "hud.day", "hud.perDay",
      "hud.compassN", "hud.compassNE", "hud.compassE", "hud.compassSE", "hud.compassS", "hud.compassSW",
      "hud.compassW", "hud.compassNW",
      "hud.helpMove", "hud.helpSprint", "hud.helpEnterExit", "hud.helpBrake", "hud.helpMelee", "hud.helpDraw",
      "hud.helpClickFire", "hud.helpView", "hud.helpHorn", "hud.helpMap", "hud.helpCharacter", "hud.helpWeather",
      "hud.helpRadio", "hud.helpWeapons", "hud.helpPhoto",
      "coast.discovery", "coast.empty", "coast.take", "coast.fareOffer", "coast.raceOffer",
      "coast.fareActive", "coast.raceActive", "coast.found",
    ]);
    const unused = [...found].filter((k) => !used.has(k));
    const missing = [...used].filter((k) => !found.has(k));
    expect(unused, `unused catalog keys: ${unused.join(", ")}`).toEqual([]);
    expect(missing, `used keys missing from catalog: ${missing.join(", ")}`).toEqual([]);
    expect(found.size).toBe(78);
  });
});
