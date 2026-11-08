/**
 * §5.1 Combat stubs — melee arc + hitscan pistol/shotgun.
 */

export type WeaponId = "melee" | "pistol" | "shotgun";

export interface HitResult {
  hit: boolean;
  damage: number;
  range: number;
  pellets?: number;
}

export interface CombatActor {
  x: number;
  z: number;
  yaw: number;
  hp: number;
}

const WEAPON: Record<WeaponId, { damage: number; range: number; pellets: number; spread: number }> = {
  melee: { damage: 28, range: 2.2, pellets: 1, spread: 0.6 },
  pistol: { damage: 18, range: 45, pellets: 1, spread: 0.04 },
  shotgun: { damage: 9, range: 18, pellets: 6, spread: 0.14 },
};

/** §5.1.1 Melee swing — forward arc hit test. */
export function meleeSwing(attacker: CombatActor, targets: CombatActor[]): HitResult[] {
  const w = WEAPON.melee;
  const out: HitResult[] = [];
  for (const t of targets) {
    const dx = t.x - attacker.x;
    const dz = t.z - attacker.z;
    const d = Math.hypot(dx, dz);
    if (d > w.range || d < 0.05) {
      out.push({ hit: false, damage: 0, range: d });
      continue;
    }
    const bearing = Math.atan2(dx, dz);
    let delta = bearing - attacker.yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const hit = Math.abs(delta) < w.spread;
    out.push({ hit, damage: hit ? w.damage : 0, range: d });
  }
  return out;
}

/** §5.1.2–3 Hitscan with falloff + pellet spread (deterministic angles). */
export function hitscan(
  weapon: "pistol" | "shotgun",
  attacker: CombatActor,
  targets: CombatActor[],
  aimJitter = 0,
): HitResult {
  const w = WEAPON[weapon];
  let best: CombatActor | null = null;
  let bestD = Infinity;
  for (const t of targets) {
    const dx = t.x - attacker.x;
    const dz = t.z - attacker.z;
    const d = Math.hypot(dx, dz);
    if (d > w.range || d >= bestD) continue;
    const bearing = Math.atan2(dx, dz);
    let delta = bearing - attacker.yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) > w.spread + aimJitter) continue;
    best = t;
    bestD = d;
  }
  if (!best) return { hit: false, damage: 0, range: 0, pellets: w.pellets };
  const falloff = 1 - bestD / w.range;
  const dmg = Math.round(w.damage * w.pellets * Math.max(0.25, falloff));
  return { hit: true, damage: dmg, range: bestD, pellets: w.pellets };
}

/** §5.1.5 Approximate TTK (seconds) vs 100 HP dummy at point-blank. */
export function ttkSeconds(weapon: WeaponId, fireIntervalSec: number): number {
  const w = WEAPON[weapon];
  const dmg = w.damage * w.pellets;
  const shots = Math.ceil(100 / dmg);
  return shots * fireIntervalSec;
}
