/**
 * §5.2.4 World ammo / weapon pickup rules (sim-side; world mounts entities).
 */

export type PickupKind = "ammo_pistol" | "ammo_shotgun" | "weapon_pistol" | "weapon_shotgun";

export interface AmmoPickupDef {
  id: string;
  kind: PickupKind;
  x: number;
  z: number;
  amount: number;
  /** Seconds until respawn after pickup; 0 = one-shot. */
  respawnSec: number;
}

export interface AmmoPickupRuntime {
  def: AmmoPickupDef;
  taken: boolean;
  respawnIn: number;
}

export function createPickup(def: AmmoPickupDef): AmmoPickupRuntime {
  return { def, taken: false, respawnIn: 0 };
}

export function tryCollect(
  p: AmmoPickupRuntime,
  px: number,
  pz: number,
  radius = 2.2,
): PickupKind | null {
  if (p.taken) return null;
  const d = Math.hypot(p.def.x - px, p.def.z - pz);
  if (d > radius) return null;
  p.taken = true;
  p.respawnIn = p.def.respawnSec;
  return p.def.kind;
}

export function stepPickup(p: AmmoPickupRuntime, dt: number): void {
  if (!p.taken || p.def.respawnSec <= 0) return;
  p.respawnIn -= dt;
  if (p.respawnIn <= 0) {
    p.taken = false;
    p.respawnIn = 0;
  }
}

export function applyPickupKind(
  kind: PickupKind,
  inv: { add: (w: "pistol" | "shotgun", n: number) => void },
): void {
  if (kind === "ammo_pistol" || kind === "weapon_pistol") inv.add("pistol", kind.startsWith("ammo") ? 24 : 12);
  else inv.add("shotgun", kind.startsWith("ammo") ? 12 : 6);
}
