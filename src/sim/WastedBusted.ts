/**
 * §6.3 Wasted / Busted flow helpers.
 */

export type DownCause = "wasted" | "busted";

export interface RespawnOutcome {
  cause: DownCause;
  fee: number;
  loseWeapons: boolean;
  respawn: { x: number; z: number; label: string };
  flavor: string;
}

const HOSPITAL = { x: -210, z: 90, label: "St. Luke's" };
const STATION = { x: -250, z: 40, label: "Central Station" };

const WASTED_LINES = [
  "You woke up in a hallway that smells like bleach and chowder.",
  "The nurse said 'walk it off' like that was medical advice.",
  "Somebody stole your shoes. The hospital kept the rest.",
];

const BUSTED_LINES = [
  "Processed, printed, and politely relieved of your hardware.",
  "The desk sergeant asked if you wanted a lawyer. You asked for coffee milk.",
  "Bail paperwork takes longer than the chase did.",
];

export function resolveDown(
  cause: DownCause,
  cash: number,
  rngNext: () => number,
): RespawnOutcome {
  if (cause === "wasted") {
    const fee = Math.min(cash, 200 + Math.floor(rngNext() * 150));
    return {
      cause,
      fee,
      loseWeapons: false,
      respawn: HOSPITAL,
      flavor: WASTED_LINES[Math.floor(rngNext() * WASTED_LINES.length)],
    };
  }
  const fee = Math.min(cash, 350 + Math.floor(rngNext() * 250));
  return {
    cause,
    fee,
    loseWeapons: true,
    respawn: STATION,
    flavor: BUSTED_LINES[Math.floor(rngNext() * BUSTED_LINES.length)],
  };
}
