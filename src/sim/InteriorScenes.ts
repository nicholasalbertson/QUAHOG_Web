/**
 * §6.2 Interior scene loading — additive room volumes (logic).
 */

export type InteriorKind = "safehouse" | "hospital" | "police" | "shop";

export interface InteriorDef {
  id: string;
  kind: InteriorKind;
  /** World door anchor. */
  doorX: number;
  doorZ: number;
  rooms: { id: string; minX: number; maxX: number; minZ: number; maxZ: number }[];
  respawn?: boolean;
}

export const INTERIORS: InteriorDef[] = [
  {
    id: "wharf-pad-int",
    kind: "safehouse",
    doorX: -260,
    doorZ: 120,
    rooms: [{ id: "studio", minX: -4, maxX: 4, minZ: -3, maxZ: 3 }],
  },
  {
    id: "hospital-int",
    kind: "hospital",
    doorX: -200,
    doorZ: 80,
    rooms: [{ id: "lobby", minX: -6, maxX: 6, minZ: -4, maxZ: 4 }],
    respawn: true,
  },
  {
    id: "police-int",
    kind: "police",
    doorX: -220,
    doorZ: 90,
    rooms: [{ id: "booking", minX: -5, maxX: 5, minZ: -4, maxZ: 4 }],
  },
];

export interface InteriorSession {
  interiorId: string | null;
  roomId: string | null;
}

export function createInteriorSession(): InteriorSession {
  return { interiorId: null, roomId: null };
}

export function enterInterior(s: InteriorSession, def: InteriorDef): void {
  s.interiorId = def.id;
  s.roomId = def.rooms[0]?.id ?? null;
}

export function exitInterior(s: InteriorSession): void {
  s.interiorId = null;
  s.roomId = null;
}

export function nearestInteriorDoor(
  x: number,
  z: number,
  maxDist = 3,
): InteriorDef | null {
  let best: InteriorDef | null = null;
  let bestD = maxDist;
  for (const i of INTERIORS) {
    const d = Math.hypot(i.doorX - x, i.doorZ - z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
