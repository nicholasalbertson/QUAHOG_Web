/**
 * §8.6.3 Boat mode in target distance checks.
 */

export type MissionMode = "foot" | "car" | "boat";

export function missionDistance(
  mode: MissionMode,
  actor: { x: number; z: number },
  target: { x: number; z: number },
): number {
  // Boat uses planar distance same as foot/car; water height ignored for objectives.
  void mode;
  return Math.hypot(actor.x - target.x, actor.z - target.z);
}

export function inMissionRange(
  mode: MissionMode,
  actor: { x: number; z: number },
  target: { x: number; z: number },
  radius: number,
): boolean {
  const scale = mode === "boat" ? 1.25 : 1; // slightly larger boat capture
  return missionDistance(mode, actor, target) <= radius * scale;
}
