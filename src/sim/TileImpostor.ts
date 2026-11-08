/**
 * §1.7.7 / §7.1.2 tileImpostor() — distant tile stand-in for streaming set.
 */

export interface TileImpostor {
  id: string;
  x: number;
  z: number;
  size: number;
  lod: number;
}

/** Build a cheap impostor descriptor for a streamed tile outside near ring. */
export function tileImpostor(tileId: string, cx: number, cz: number, size = 256, lod = 2): TileImpostor {
  return { id: `imp-${tileId}`, x: cx, z: cz, size, lod };
}

export function impostorsForTiles(
  tiles: { id: string; minX: number; maxX: number; minZ: number; maxZ: number }[],
  player: { x: number; z: number },
  nearDist = 400,
): TileImpostor[] {
  const out: TileImpostor[] = [];
  for (const t of tiles) {
    const cx = (t.minX + t.maxX) / 2;
    const cz = (t.minZ + t.maxZ) / 2;
    const d = Math.hypot(cx - player.x, cz - player.z);
    if (d > nearDist) out.push(tileImpostor(t.id, cx, cz, t.maxX - t.minX, d > nearDist * 2 ? 3 : 2));
  }
  return out;
}
