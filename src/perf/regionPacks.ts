import packs from "../content/licensedPacks.json";

// Vegetation and props stay on disk until a district is actually dressing
// the street. Characters, vehicles, and the HDRI are shared by every region.
const WHEN_DRESSING = new Set(["vegetation", "prop"]);

export interface RegionPack {
  id: string;
  role: string;
  dest: string;
  regions?: string[];
}

export function packsRequestedAt(region: string, dressing: boolean): RegionPack[] {
  return (packs.packs as RegionPack[]).filter((pack) => {
    if (pack.regions && pack.regions.length > 0 && !pack.regions.includes(region)) return false;
    if (WHEN_DRESSING.has(pack.role) && !dressing) return false;
    return true;
  });
}
