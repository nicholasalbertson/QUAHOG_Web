/**
 * §1.9.6 Car damage — panel/engine/wheel HP + stages.
 */

export type DamageStage = "ok" | "smoke" | "fire" | "wreck";

export interface CarDamageState {
  body: number;
  engine: number;
  wheelFL: number;
  wheelFR: number;
  wheelRL: number;
  wheelRR: number;
  stage: DamageStage;
}

export function createCarDamage(): CarDamageState {
  return {
    body: 100,
    engine: 100,
    wheelFL: 100,
    wheelFR: 100,
    wheelRL: 100,
    wheelRR: 100,
    stage: "ok",
  };
}

export function applyImpact(d: CarDamageState, speed: number, intoEngine = false): CarDamageState {
  const amt = Math.min(40, Math.abs(speed) * 1.8);
  d.body = Math.max(0, d.body - amt);
  if (intoEngine) d.engine = Math.max(0, d.engine - amt * 0.8);
  // Randomish wheel nibble from impact magnitude (deterministic via speed hash).
  if (Math.abs(speed) > 8) {
    const pick = Math.floor(Math.abs(speed) * 10) % 4;
    const keys = ["wheelFL", "wheelFR", "wheelRL", "wheelRR"] as const;
    d[keys[pick]] = Math.max(0, d[keys[pick]] - amt * 0.35);
  }
  d.stage = stageOf(d);
  return d;
}

export function stageOf(d: CarDamageState): DamageStage {
  if (d.body <= 0 || d.engine <= 0) return "wreck";
  if (d.body < 25 || d.engine < 30) return "fire";
  if (d.body < 55 || d.engine < 60) return "smoke";
  return "ok";
}

/** Steering pull from asymmetric wheel damage (−1..1). */
export function steeringPull(d: CarDamageState): number {
  const left = (d.wheelFL + d.wheelRL) / 2;
  const right = (d.wheelFR + d.wheelRR) / 2;
  return (right - left) / 100;
}

export function powerMul(d: CarDamageState): number {
  if (d.stage === "wreck") return 0;
  return Math.max(0.15, d.engine / 100);
}
