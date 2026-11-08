/**
 * §1.10.6 Context-sensitive action button resolver.
 */

import type { InteractPrompt } from "./InteractPrompt";
import type { InputMode } from "./InputMode";

export type ContextActionId =
  | "enter"
  | "exit"
  | "interact"
  | "pickup"
  | "sleep"
  | "buy"
  | "talk"
  | "none";

export function resolveContextAction(
  mode: InputMode,
  prompt: InteractPrompt | null,
  nearVehicle: boolean,
  inVehicle: boolean,
): ContextActionId {
  if (mode === "menu" || mode === "cutscene") return "none";
  if (inVehicle) return "exit";
  if (nearVehicle) return "enter";
  if (!prompt) return "none";
  switch (prompt.kind) {
    case "sleep": return "sleep";
    case "buy": case "shop": return "buy";
    case "talk": case "mission": return "talk";
    case "enter": return "enter";
    default: return "interact";
  }
}
