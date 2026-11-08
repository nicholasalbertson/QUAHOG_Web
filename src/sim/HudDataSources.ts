/**
 * §10.1.6 Every HUD element has a data source.
 */

export const HUD_DATA_SOURCES: Record<string, string> = {
  health: "useStats.health",
  cash: "useEconomy.cash",
  wanted: "HeatAxes.wanted / heatTier",
  minimap: "shared.player + WorldStreamer",
  compass: "sim/Compass.compassReading",
  mission: "useMission.steps[step]",
  interact: "sim/InteractPrompt.prompts",
  weapon: "useGame.weapon",
  radio: "sim/RadioStations",
  damage: "sim/DamageIndicator",
};

export function missingHudSources(present: string[]): string[] {
  return Object.keys(HUD_DATA_SOURCES).filter((k) => !present.includes(k));
}
