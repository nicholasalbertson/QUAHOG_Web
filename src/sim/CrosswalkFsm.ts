/**
 * §1.2.18 Crosswalk FSM: approach → wait → cross → clear.
 * Driven by a simple phase clock until §13.1 signal FSM lands.
 */

export type CrosswalkPhase = "approach" | "wait" | "cross" | "clear";

export interface CrosswalkAgent {
  phase: CrosswalkPhase;
  waitT: number;
}

export function createCrosswalkAgent(): CrosswalkAgent {
  return { phase: "approach", waitT: 0 };
}

/**
 * @param walkWindow true when signal allows crossing (or unsignalized always).
 */
export function stepCrosswalk(
  a: CrosswalkAgent,
  dt: number,
  atCrosswalk: boolean,
  walkWindow: boolean,
): CrosswalkPhase {
  switch (a.phase) {
    case "approach":
      if (atCrosswalk) {
        a.phase = walkWindow ? "cross" : "wait";
        a.waitT = 0;
      }
      break;
    case "wait":
      a.waitT += dt;
      if (walkWindow) a.phase = "cross";
      else if (a.waitT > 12) a.phase = "clear"; // give up
      break;
    case "cross":
      if (!atCrosswalk) a.phase = "clear";
      if (!walkWindow) a.phase = "wait";
      break;
    case "clear":
      if (!atCrosswalk) a.phase = "approach";
      break;
  }
  return a.phase;
}

/** Synthetic walk window from elapsed time (4s walk / 4s don't). */
export function walkWindowFromClock(elapsed: number, phase = 0): boolean {
  return ((elapsed + phase) % 8) < 4;
}
