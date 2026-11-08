/**
 * §2.1.2 Alloc-free hot paths — preallocated scratch vectors.
 */

export interface Scratch2 {
  x: number;
  z: number;
}

export interface Scratch3 {
  x: number;
  y: number;
  z: number;
}

const scratch2: Scratch2[] = Array.from({ length: 8 }, () => ({ x: 0, z: 0 }));
const scratch3: Scratch3[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, z: 0 }));
let i2 = 0;
let i3 = 0;

/** Borrow a reusable 2D scratch (do not retain across frames). */
export function borrow2(slot = 0): Scratch2 {
  const s = scratch2[slot % scratch2.length]!;
  s.x = 0;
  s.z = 0;
  return s;
}

export function borrow3(slot = 0): Scratch3 {
  const s = scratch3[slot % scratch3.length]!;
  s.x = 0;
  s.y = 0;
  s.z = 0;
  return s;
}

/** Round-robin next scratch2. */
export function next2(): Scratch2 {
  i2 = (i2 + 1) % scratch2.length;
  return scratch2[i2]!;
}

export function next3(): Scratch3 {
  i3 = (i3 + 1) % scratch3.length;
  return scratch3[i3]!;
}

export function set2(out: Scratch2, x: number, z: number): Scratch2 {
  out.x = x;
  out.z = z;
  return out;
}

export function set3(out: Scratch3, x: number, y: number, z: number): Scratch3 {
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}
