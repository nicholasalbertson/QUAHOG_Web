// Fares and street races. Pins are latitude and longitude so the street map
// and the tiles build share one list. The module keeps the active job; the
// HUD only displays what these functions return.

import { metersBetween } from "./discovery";

export interface LatLon { lat: number; lon: number }

export interface Fare {
  id: string;
  name: string;
  pickup: LatLon;
  drop: LatLon;
  pay: number;
}

export interface StreetRace {
  id: string;
  name: string;
  gates: LatLon[];
  pay: number;
  limitSec: number;
}

export const PICKUP_M = 70;
export const DROP_M = 55;
export const GATE_M = 60;

export const FARES: Fare[] = [
  {
    id: "narrows-cove",
    name: "Battleship Cove",
    pickup: { lat: 41.7028, lon: -71.1575 },
    drop: { lat: 41.7044, lon: -71.1641 },
    pay: 80,
  },
  {
    id: "bethel-pier",
    name: "State Pier",
    pickup: { lat: 41.636, lon: -70.9205 },
    drop: { lat: 41.6342, lon: -70.9188 },
    pay: 90,
  },
  {
    id: "main-westgate",
    name: "Westgate",
    pickup: { lat: 42.08229, lon: -71.02002 },
    drop: { lat: 42.0924, lon: -71.0456 },
    pay: 140,
  },
  {
    id: "harbor-main",
    name: "Hyannis Main",
    pickup: { lat: 41.65075, lon: -70.27325 },
    drop: { lat: 41.6528, lon: -70.2832 },
    pay: 70,
  },
];

export const RACES: StreetRace[] = [
  {
    id: "braga-run",
    name: "Braga run",
    gates: [
      { lat: 41.7044, lon: -71.1641 },
      { lat: 41.7047, lon: -71.1569 },
      { lat: 41.7015, lon: -71.1547 },
    ],
    pay: 200,
    limitSec: 120,
  },
  {
    id: "canal-run",
    name: "Canal run",
    gates: [
      { lat: 41.7476, lon: -70.5902 },
      { lat: 41.76, lon: -70.57 },
      { lat: 41.7746, lon: -70.5428 },
    ],
    pay: 400,
    limitSec: 180,
  },
];

export type SideEvent =
  | { type: "paid"; cash: number; text: string }
  | { type: "failed"; text: string };

type Active =
  | { kind: "fare"; id: string }
  | { kind: "race"; id: string; gate: number; elapsed: number };

let active: Active | null = null;

export function resetActivities(): void {
  active = null;
}

export function activeSide(): Active | null {
  return active ? { ...active } : null;
}

function fareById(id: string): Fare | undefined {
  return FARES.find((fare) => fare.id === id);
}

function raceById(id: string): StreetRace | undefined {
  return RACES.find((race) => race.id === id);
}

export function nearestFare(lat: number, lon: number, radius = PICKUP_M): Fare | null {
  const here = { lat, lon };
  let best: Fare | null = null;
  let bestD = radius;
  for (const fare of FARES) {
    const d = metersBetween(here, fare.pickup);
    if (d <= bestD) { best = fare; bestD = d; }
  }
  return best;
}

export function nearestRace(lat: number, lon: number, radius = PICKUP_M): StreetRace | null {
  const here = { lat, lon };
  let best: StreetRace | null = null;
  let bestD = radius;
  for (const race of RACES) {
    const d = metersBetween(here, race.gates[0]);
    if (d <= bestD) { best = race; bestD = d; }
  }
  return best;
}

export type SidePrompt =
  | { kind: "fare-offer"; name: string }
  | { kind: "race-offer"; name: string }
  | { kind: "fare"; name: string }
  | { kind: "race"; n: number };

/** What the HUD should say. Null when nothing is offered or running. */
export function sidePrompt(lat: number, lon: number, driving: boolean): SidePrompt | null {
  if (active?.kind === "fare") {
    const fare = fareById(active.id);
    return fare ? { kind: "fare", name: fare.name } : null;
  }
  if (active?.kind === "race") {
    return { kind: "race", n: active.gate };
  }
  const fare = nearestFare(lat, lon);
  if (fare) return { kind: "fare-offer", name: fare.name };
  if (driving) {
    const race = nearestRace(lat, lon);
    if (race) return { kind: "race-offer", name: race.name };
  }
  return null;
}

export function acceptSide(lat: number, lon: number, driving: boolean): boolean {
  if (active) return false;
  const fare = nearestFare(lat, lon);
  if (fare) {
    active = { kind: "fare", id: fare.id };
    return true;
  }
  if (!driving) return false;
  const race = nearestRace(lat, lon);
  if (!race) return false;
  active = { kind: "race", id: race.id, gate: 1, elapsed: 0 };
  return true;
}

export function tickSide(lat: number, lon: number, driving: boolean, dt: number): SideEvent[] {
  if (!active || dt < 0) return [];
  const here = { lat, lon };
  if (active.kind === "fare") {
    const fare = fareById(active.id);
    if (!fare) { active = null; return []; }
    if (!driving || metersBetween(here, fare.drop) > DROP_M) return [];
    active = null;
    return [{ type: "paid", cash: fare.pay, text: `Fare paid · +$${fare.pay}` }];
  }
  const race = raceById(active.id);
  if (!race) { active = null; return []; }
  active.elapsed += dt;
  if (!driving || active.elapsed > race.limitSec) {
    active = null;
    return [{ type: "failed", text: "Race over." }];
  }
  const gate = race.gates[active.gate];
  if (!gate || metersBetween(here, gate) > GATE_M) return [];
  active.gate += 1;
  if (active.gate < race.gates.length) return [];
  active = null;
  return [{ type: "paid", cash: race.pay, text: `Race won · +$${race.pay}` }];
}
