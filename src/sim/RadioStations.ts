/**
 * §9.3 Radio station registry aligned with audio/radioEngine STATIONS.
 * Rage/Anvil talk pools come from host.lines (never empty).
 */

import { STATIONS } from "../audio/radioEngine";

export interface RadioStationDef {
  id: string;
  name: string;
  /** Track / talk ids (never empty). */
  tracks: string[];
}

/** Mirror live radioEngine catalog so Rage/Anvil talk pools stay filled. */
export const RADIO_STATIONS: RadioStationDef[] = STATIONS.map((s) => {
  const lines = s.host?.lines ?? [];
  const tracks =
    lines.length > 0
      ? lines.map((_, i) => `${s.id}-line-${i}`)
      : [`${s.id}-bed`];
  return { id: s.id, name: s.name, tracks };
});

export function stationById(id: string): RadioStationDef | undefined {
  return RADIO_STATIONS.find((s) => s.id === id);
}

export function assertStationsNonEmpty(stations = RADIO_STATIONS): string[] {
  return stations.filter((s) => s.tracks.length === 0).map((s) => s.id);
}

export function persistStation(id: string, save: (v: { station: string }) => void): void {
  if (!stationById(id)) return;
  save({ station: id });
}

export function restoreStation(
  raw: { station?: string } | null | undefined,
  fallback = RADIO_STATIONS[0]?.id ?? "whale",
): string {
  const id = raw?.station;
  return id && stationById(id) ? id : fallback;
}
