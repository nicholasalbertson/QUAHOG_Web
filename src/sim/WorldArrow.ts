/**
 * §8.6.1 3D world arrow widget (on/off-screen).
 */

export interface WorldArrow {
  /** World target. */
  tx: number;
  tz: number;
  /** Screen-space hint when off-screen (normalized -1..1). */
  screenX: number;
  screenY: number;
  onScreen: boolean;
  distance: number;
}

export function worldArrow(
  player: { x: number; z: number; yaw: number },
  target: { x: number; z: number },
  fovHalfRad = Math.PI / 3,
): WorldArrow {
  const dx = target.x - player.x;
  const dz = target.z - player.z;
  const distance = Math.hypot(dx, dz);
  const bearing = Math.atan2(dx, dz);
  let delta = bearing - player.yaw;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const onScreen = Math.abs(delta) <= fovHalfRad;
  const screenX = Math.max(-1, Math.min(1, delta / fovHalfRad));
  return {
    tx: target.x,
    tz: target.z,
    screenX,
    screenY: onScreen ? 0.2 : 0.85,
    onScreen,
    distance,
  };
}
