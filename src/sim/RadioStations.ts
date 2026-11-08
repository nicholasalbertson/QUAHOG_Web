/**
 * §9.3 Radio station registry + persistence helpers.
 */

export interface RadioStationDef {
  id: string;
  name: string;
  /** Track ids (never empty). */
  tracks: string[];
}

export const RADIO_STATIONS: RadioStationDef[] = [
  { id: "whaling", name: "Whaling City AM", tracks: ["host-a", "ad-chowder", "news-1"] },
  { id: "kempton", name: "Kempton Rock", tracks: ["rock-1", "rock-2", "ident-k"] },
  { id: "foghorn", name: "Foghorn Jazz", tracks: ["jazz-1", "jazz-2"] },
  { id: "southcoast", name: "South Coast Talk", tracks: ["talk-1", "ad-cab", "talk-2"] },
  { id: "marealta", name: "Maré Alta", tracks: ["latin-1", "latin-2", "ident-m"] },
  { id: "pier", name: "Pier Pulse", tracks: ["pulse-1", "pulse-2", "ad-ferry"] },
];

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
  fallback = RADIO_STATIONS[0].id,
): string {
  const id = raw?.station;
  return id && stationById(id) ? id : fallback;
}
