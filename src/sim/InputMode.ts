/**
 * §1.10 Input mode FSM — foot | car | boat | swim | menu | cutscene.
 */

export type InputMode = "foot" | "car" | "boat" | "swim" | "menu" | "cutscene";

export interface InputModeState {
  mode: InputMode;
  override: InputMode | null;
}

export function createInputMode(mode: InputMode = "foot"): InputModeState {
  return { mode, override: null };
}

export function effectiveMode(s: InputModeState): InputMode {
  return s.override ?? s.mode;
}

/** Auto-switch on enter/exit vehicle / water / UI. */
export function autoSwitch(
  s: InputModeState,
  event: "enterCar" | "exitCar" | "enterBoat" | "exitBoat" | "enterWater" | "exitWater" | "openMenu" | "closeMenu" | "beginCutscene" | "endCutscene",
): InputMode {
  if (s.override && event !== "closeMenu" && event !== "endCutscene") {
    // Manual override sticks except when leaving overlay modes.
    return effectiveMode(s);
  }
  switch (event) {
    case "enterCar": s.mode = "car"; break;
    case "exitCar": s.mode = "foot"; break;
    case "enterBoat": s.mode = "boat"; break;
    case "exitBoat": s.mode = "foot"; break;
    case "enterWater": s.mode = "swim"; break;
    case "exitWater": s.mode = "foot"; break;
    case "openMenu": s.mode = "menu"; break;
    case "closeMenu": s.mode = s.mode === "menu" ? "foot" : s.mode; break;
    case "beginCutscene": s.mode = "cutscene"; break;
    case "endCutscene": s.mode = s.mode === "cutscene" ? "foot" : s.mode; break;
  }
  return effectiveMode(s);
}

export function setOverride(s: InputModeState, mode: InputMode | null): void {
  s.override = mode;
}
