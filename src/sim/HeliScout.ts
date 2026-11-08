/**
 * §3.3.4 Helicopter orbit + spotlight + LOS report (stub).
 */

export interface HeliState {
  x: number;
  z: number;
  y: number;
  orbitAngle: number;
  spotlightOn: boolean;
  hasLos: boolean;
}

export function createHeli(cx: number, cz: number): HeliState {
  return { x: cx + 60, z: cz, y: 45, orbitAngle: 0, spotlightOn: true, hasLos: false };
}

export function stepHeli(
  h: HeliState,
  target: { x: number; z: number },
  dt: number,
  radius = 70,
  occluded = false,
): HeliState {
  h.orbitAngle += dt * 0.35;
  h.x = target.x + Math.cos(h.orbitAngle) * radius;
  h.z = target.z + Math.sin(h.orbitAngle) * radius;
  h.hasLos = !occluded && Math.hypot(h.x - target.x, h.z - target.z) < radius * 1.2;
  h.spotlightOn = h.hasLos;
  return h;
}
