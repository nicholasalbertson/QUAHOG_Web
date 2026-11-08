/**
 * §10.4.1 Screen reader labels for HUD + menus.
 */

export const HUD_LABELS: Record<string, string> = {
  health: "Player health",
  wanted: "Wanted level",
  cash: "Cash on hand",
  minimap: "Minimap",
  interact: "Interact",
  pause: "Pause menu",
  mission: "Current mission objective",
  weapon: "Current weapon",
  radio: "Radio station",
};

export function labelFor(id: string): string {
  return HUD_LABELS[id] ?? id;
}
