/**
 * §5.2.6 / §10.1.5 Weapon wheel state machine.
 */

export type WheelSlot = "unarmed" | "melee" | "pistol" | "shotgun";

export interface WeaponWheelState {
  open: boolean;
  cursor: number;
  slots: WheelSlot[];
  selected: WheelSlot;
}

export function createWeaponWheel(owned: WheelSlot[] = ["unarmed", "melee"]): WeaponWheelState {
  const slots = Array.from(new Set<WheelSlot>(["unarmed", ...owned]));
  return { open: false, cursor: 0, slots, selected: slots[0] };
}

export function openWheel(w: WeaponWheelState): void {
  w.open = true;
  w.cursor = Math.max(0, w.slots.indexOf(w.selected));
}

export function closeWheel(w: WeaponWheelState, commit = true): WheelSlot {
  w.open = false;
  if (commit) w.selected = w.slots[w.cursor] ?? w.selected;
  return w.selected;
}

export function nudgeWheel(w: WeaponWheelState, dir: -1 | 1): void {
  if (!w.open || w.slots.length === 0) return;
  w.cursor = (w.cursor + dir + w.slots.length) % w.slots.length;
}

export function unlockSlot(w: WeaponWheelState, slot: WheelSlot): void {
  if (!w.slots.includes(slot)) w.slots.push(slot);
}
