/**
 * §3.3.3 Roadblocks — spawn ahead on RoadGraph (stub placement).
 */

export interface Roadblock {
  id: string;
  x: number;
  z: number;
  yaw: number;
  manned: boolean;
}

/** Place a static roadblock roughly ahead of the player along yaw. */
export function spawnRoadblockAhead(
  id: string,
  player: { x: number; z: number; yaw: number },
  distance = 55,
  manned = true,
): Roadblock {
  return {
    id,
    x: player.x + Math.sin(player.yaw) * distance,
    z: player.z + Math.cos(player.yaw) * distance,
    yaw: player.yaw + Math.PI / 2,
    manned,
  };
}
