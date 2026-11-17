// Opening drive across the region. Geographic targets, so a frame rebase
// does not move the goal. Separate from the shared mission list: finishing
// this hands the player to the existing campaign, it does not rewrite it.

import { latLonToLocal, type LatLon } from "./geo";

export interface ArcStep {
  id: string;
  title: string;
  text: string;
  lat: number;
  lon: number;
  radius: number;
  needCar?: boolean;
  reward: number;
}

export const OPENING_ARC: ArcStep[] = [
  {
    id: "narrows",
    title: "The Narrows",
    text: "Stand on the Quequechan at The Narrows.",
    lat: 41.7028,
    lon: -71.1575,
    radius: 45,
    reward: 100,
  },
  {
    id: "cove",
    title: "The Narrows",
    text: "Walk Battleship Cove. The ship is tied up at the pier.",
    lat: 41.7044,
    lon: -71.1641,
    radius: 55,
    reward: 150,
  },
  {
    id: "i195",
    title: "The Narrows",
    text: "Take a car east on I-195 toward New Bedford.",
    lat: 41.675,
    lon: -71.03,
    radius: 160,
    needCar: true,
    reward: 250,
  },
  {
    id: "bethel",
    title: "The Narrows",
    text: "Park at Seamen's Bethel. Deacon Mealy is waiting.",
    lat: 41.636,
    lon: -70.9205,
    radius: 55,
    needCar: true,
    reward: 300,
  },
];

let index = 0;

export function arcIndex(): number {
  return index;
}

export function arcDone(): boolean {
  return index >= OPENING_ARC.length;
}

export function currentArc(): ArcStep | null {
  return OPENING_ARC[index] ?? null;
}

export function loadArc(step: number): void {
  if (!Number.isFinite(step) || step < 0) index = 0;
  else index = Math.min(OPENING_ARC.length, Math.floor(step));
}

export function advanceArc(): ArcStep | null {
  const done = currentArc();
  if (!done) return null;
  index += 1;
  return done;
}

export function resetArc(): void {
  index = 0;
}

/** Skip the opener. Used when a save already has campaign progress and no arc step. */
export function finishArc(): void {
  index = OPENING_ARC.length;
}

/** Meters from the player to this step, in the active local frame. */
export function arcDistance(anchor: LatLon, x: number, z: number, step: ArcStep): number {
  const local = latLonToLocal(anchor, step);
  return Math.hypot(local.x - x, local.z - z);
}
