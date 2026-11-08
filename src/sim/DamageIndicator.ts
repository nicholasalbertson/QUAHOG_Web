/**
 * §10.1.2 Damage direction indicator — world hit → screen angle.
 */

export interface DamagePulse {
  /** Screen angle degrees (0 = forward). */
  angle: number;
  strength: number;
  ttl: number;
}

export function damageFromHit(
  playerYaw: number,
  player: { x: number; z: number },
  hitFrom: { x: number; z: number },
  strength = 1,
): DamagePulse {
  const bearing = Math.atan2(hitFrom.x - player.x, hitFrom.z - player.z);
  let delta = bearing - playerYaw;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return {
    angle: (delta * 180) / Math.PI,
    strength: Math.max(0, Math.min(1, strength)),
    ttl: 1.2,
  };
}

export function stepDamagePulses(pulses: DamagePulse[], dt: number): DamagePulse[] {
  const out: DamagePulse[] = [];
  for (const p of pulses) {
    const ttl = p.ttl - dt;
    if (ttl > 0) out.push({ ...p, ttl, strength: p.strength * (ttl / 1.2) });
  }
  return out;
}
