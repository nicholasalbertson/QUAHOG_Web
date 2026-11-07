/**
 * §7 — Inter-district corridor scaffolding.
 * Phase 1 districts are fast-travel only; this catalog documents the
 * intended future driveable corridors so UI/debug can preview them.
 */

import type { DistrictId } from "../districts";

export interface CorridorDef {
  id: string;
  from: DistrictId;
  to: DistrictId;
  /** Rough world midpoints along the intended highway (x,z). */
  waypoints: [number, number][];
  highway: string;
  status: "planned" | "scaffolded" | "live";
  note: string;
}

/** I-195 NB → FR waypoint list (world x,z) for mission corridor rings. */
export const I195_NB_FR: [number, number][] = [
  [-256, 106], // NB waterfront
  [-4000, 400],
  [-8000, 900],
  [-13280, 1781], // Westport
  [-16000, -2500],
  [-19000, -7000], // Braga Bridge
  [-19972, -7348], // Battleship Cove
];

export const CORRIDORS: CorridorDef[] = [
  {
    id: "nb-fr-195",
    from: "newBedford",
    to: "fallRiver",
    waypoints: I195_NB_FR,
    highway: "I-195",
    status: "scaffolded",
    note: "Braga Bridge approach — currently remount via BigMap fast travel.",
  },
  {
    id: "nb-brockton-24",
    from: "newBedford",
    to: "brockton",
    waypoints: [
      [-400, -2000],
      [-4000, -20000],
      [-7000, -40000],
      [-8266, -49696],
    ],
    highway: "Route 24",
    status: "planned",
    note: "Northbound Rt 24 corridor reserved; not driveable yet.",
  },
  {
    id: "nb-cape-6",
    from: "newBedford",
    to: "cape",
    waypoints: [
      [2000, 500],
      [20000, 0],
      [40000, -800],
      [53822, -1617],
    ],
    highway: "Route 6 / Bourne",
    status: "planned",
    note: "Cape approach via canal bridges — scaffolding only.",
  },
];

export function corridorsFrom(id: DistrictId): CorridorDef[] {
  return CORRIDORS.filter((c) => c.from === id || c.to === id);
}
