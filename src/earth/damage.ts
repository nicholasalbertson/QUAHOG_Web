// Vehicle condition for the photoreal car. Body and engine are 0–100.
// A hard hit spends both. Repair is a cash bill while stopped.

export interface Condition { body: number; engine: number }

export function impactDamage(speed: number): { body: number; engine: number } {
  const s = Math.max(0, speed);
  if (s < 8) return { body: 0, engine: 0 };
  return {
    body: Math.min(40, Math.round(s * 1.1)),
    engine: Math.min(25, Math.round(s * 0.45)),
  };
}

export function applyImpact(cond: Condition, speed: number): Condition {
  const hit = impactDamage(speed);
  return {
    body: Math.max(0, cond.body - hit.body),
    engine: Math.max(0, cond.engine - hit.engine),
  };
}

/** Dollars to restore both bars. Undamaged is free. */
export function repairBill(body: number, engine: number): number {
  const missing = Math.max(0, 100 - body) + Math.max(0, 100 - engine);
  return missing * 3;
}

/** Throttle scale. A dead engine still creeps. */
export function powerFor(engine: number): number {
  if (!Number.isFinite(engine)) return 1;
  return Math.max(0.15, Math.min(1, engine / 100));
}
