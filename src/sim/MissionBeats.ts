/**
 * §8.3 Mission beat types — timed / escort / destroy / photo / delivery.
 */

export type BeatKind = "timed" | "escort" | "destroy" | "photo" | "delivery";

export interface BeatBase {
  id: string;
  kind: BeatKind;
  complete: boolean;
  failed: boolean;
}

export interface TimedBeat extends BeatBase {
  kind: "timed";
  limitSec: number;
  elapsed: number;
}

export interface EscortBeat extends BeatBase {
  kind: "escort";
  targetHp: number;
  maxSep: number;
  sep: number;
}

export interface DestroyBeat extends BeatBase {
  kind: "destroy";
  remaining: number;
}

export interface PhotoBeat extends BeatBase {
  kind: "photo";
  subjectId: string;
  framed: boolean;
  shot: boolean;
}

export interface DeliveryBeat extends BeatBase {
  kind: "delivery";
  hasPackage: boolean;
  delivered: boolean;
}

export type MissionBeat = TimedBeat | EscortBeat | DestroyBeat | PhotoBeat | DeliveryBeat;

export function stepTimed(b: TimedBeat, dt: number): TimedBeat {
  if (b.complete || b.failed) return b;
  b.elapsed += dt;
  if (b.elapsed >= b.limitSec) b.failed = true;
  return b;
}

export function stepEscort(
  b: EscortBeat,
  hp: number,
  sep: number,
  arrived = false,
): EscortBeat {
  if (b.complete || b.failed) return b;
  b.targetHp = hp;
  b.sep = sep;
  if (hp <= 0 || sep > b.maxSep) b.failed = true;
  else if (arrived && sep <= b.maxSep && hp > 0) b.complete = true;
  return b;
}

export function destroyTarget(b: DestroyBeat): DestroyBeat {
  if (b.complete || b.failed) return b;
  b.remaining = Math.max(0, b.remaining - 1);
  if (b.remaining === 0) b.complete = true;
  return b;
}

export function evaluatePhoto(
  b: PhotoBeat,
  framing: { subjectInView: boolean; centered: boolean },
  shutter: boolean,
): PhotoBeat {
  if (b.complete || b.failed) return b;
  b.framed = framing.subjectInView && framing.centered;
  if (shutter && b.framed) {
    b.shot = true;
    b.complete = true;
  }
  return b;
}

export function stepDelivery(b: DeliveryBeat, atPickup: boolean, atDrop: boolean, interact: boolean): DeliveryBeat {
  if (b.complete || b.failed) return b;
  if (!b.hasPackage && atPickup && interact) b.hasPackage = true;
  if (b.hasPackage && atDrop && interact) {
    b.delivered = true;
    b.complete = true;
  }
  return b;
}
