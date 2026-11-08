/**
 * §8.5 Fail overlay state — retry / abandon menu model (HUD binds later).
 */

export type FailMenuAction = "retry" | "abandon" | "dismiss";

export interface FailMenuState {
  open: boolean;
  reason: string;
  canRetry: boolean;
}

export function openFailMenu(reason: string, canRetry = true): FailMenuState {
  return { open: true, reason, canRetry };
}

export function chooseFailAction(
  state: FailMenuState,
  action: FailMenuAction,
): { state: FailMenuState; action: FailMenuAction } {
  if (!state.open && action !== "dismiss") {
    return { state, action: "dismiss" };
  }
  return {
    state: { ...state, open: false },
    action,
  };
}
