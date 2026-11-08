/**
 * §5.1.4 Weapon switch animation/state.
 */

export type WeaponSlot = "unarmed" | "melee" | "pistol" | "shotgun";

export interface WeaponSwitchState {
  current: WeaponSlot;
  pending: WeaponSlot | null;
  blend: number; // 0..1 during switch
  switching: boolean;
}

export function createWeaponSwitch(current: WeaponSlot = "unarmed"): WeaponSwitchState {
  return { current, pending: null, blend: 0, switching: false };
}

export function requestSwitch(s: WeaponSwitchState, next: WeaponSlot): void {
  if (next === s.current && !s.switching) return;
  s.pending = next;
  s.switching = true;
  s.blend = 0;
}

export function stepWeaponSwitch(s: WeaponSwitchState, dt: number, duration = 0.28): WeaponSlot {
  if (!s.switching || !s.pending) return s.current;
  s.blend = Math.min(1, s.blend + dt / duration);
  if (s.blend >= 1) {
    s.current = s.pending;
    s.pending = null;
    s.switching = false;
    s.blend = 0;
  }
  return s.current;
}
