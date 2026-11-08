/**
 * §1.10.3–5 Context-sensitive action sets per locomotion mode.
 */

import type { InputMode } from "./InputMode";

export type SimAction =
  | "move"
  | "look"
  | "sprint"
  | "interact"
  | "jump"
  | "throttle"
  | "brake"
  | "steer"
  | "handbrake"
  | "horn"
  | "camera"
  | "rudder"
  | "anchor"
  | "pause";

const FOOT: SimAction[] = ["move", "look", "sprint", "interact", "jump", "camera", "pause"];
const CAR: SimAction[] = ["throttle", "brake", "steer", "handbrake", "horn", "camera", "interact", "pause"];
const BOAT: SimAction[] = ["throttle", "rudder", "camera", "anchor", "interact", "pause"];
const SWIM: SimAction[] = ["move", "look", "camera", "pause"];
const MENU: SimAction[] = ["pause"];
const CUTSCENE: SimAction[] = ["pause"];

const SETS: Record<InputMode, readonly SimAction[]> = {
  foot: FOOT,
  car: CAR,
  boat: BOAT,
  swim: SWIM,
  menu: MENU,
  cutscene: CUTSCENE,
};

export function actionsFor(mode: InputMode): readonly SimAction[] {
  return SETS[mode];
}

export function actionReachable(mode: InputMode, action: SimAction): boolean {
  return SETS[mode].includes(action);
}

/** Every non-menu mode exposes camera + pause; foot has move; car has steer. */
export function assertNoDeadZones(): string[] {
  const errs: string[] = [];
  for (const mode of Object.keys(SETS) as InputMode[]) {
    const set = SETS[mode];
    if (mode !== "menu" && mode !== "cutscene" && !set.includes("pause")) {
      errs.push(`${mode}: missing pause`);
    }
  }
  if (!actionReachable("foot", "move")) errs.push("foot: move dead");
  if (!actionReachable("car", "steer")) errs.push("car: steer dead");
  if (!actionReachable("boat", "rudder")) errs.push("boat: rudder dead");
  return errs;
}
