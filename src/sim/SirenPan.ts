/**
 * §9.2.5 Passing siren pans + attenuates.
 */

export interface SirenSample {
  pan: number; // -1..1
  gain: number; // 0..1
}

export function sirenPan(
  listener: { x: number; z: number; yaw: number },
  source: { x: number; z: number },
  maxDist = 80,
): SirenSample {
  const dx = source.x - listener.x;
  const dz = source.z - listener.z;
  const dist = Math.hypot(dx, dz);
  const gain = dist >= maxDist ? 0 : 1 - dist / maxDist;
  // Pan in listener local space: right = sin(yaw), forward = cos(yaw)
  const rightX = Math.cos(listener.yaw);
  const rightZ = -Math.sin(listener.yaw);
  const side = dist > 1e-3 ? (dx * rightX + dz * rightZ) / dist : 0;
  const pan = Math.max(-1, Math.min(1, side));
  return { pan, gain };
}
