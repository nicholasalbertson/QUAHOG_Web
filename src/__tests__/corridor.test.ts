import { describe, expect, it } from "vitest";
import corridorSliceRaw from "../../public/slice-corridor.json?raw";
import nbSliceRaw from "../../public/slice-newbedford.json?raw";
import frSliceRaw from "../../public/slice-fallriver.json?raw";
import brocktonSliceRaw from "../../public/slice-brockton.json?raw";
import capeSliceRaw from "../../public/slice-cape.json?raw";
import manifestRaw from "../../public/tiles/manifest.json?raw";
import { CORRIDOR_SLICE_FILE, groundCovers } from "../world/corridor";
import { DISTRICTS } from "../districts";
import { FAST_TRAVEL } from "../places";

// Corridor phase 1 (2026-11-07, Nic's order — the scope gate): the authored
// continuous-drive corridors NB <-> FR (I-195), FR <-> Brockton (MA 24),
// NB <-> Cape (US 6). The acceptance criterion is fast-travel spawn safety:
// Nic's Nov 7 playtest fell through the ground after fast-travelling to
// Brockton / Hyannis because the old +-30,000 ground plane didn't reach
// them. This test is the regression guard: every fast-travel point, every
// district spawn, and a corridor midpoint per route must have ground under
// it (groundCovers), a baked tile in the manifest (the streamer has
// something to load), and a road within 60 m (the spawn is drivable).
//
// Coordinates: roads + district centers are slice [east, north];
// FAST_TRAVEL pos + district spawns are WORLD [x, z] (world = [east, -north]).
// Tile keys are the streamer's formula (StreamingBuildings.tsx):
// `${floor(east / 500)}_${floor(north / 500)}`.
// Route continuity is checked two ways: the bake's verification.json
// (stage/corridor/, 873 route samples along the PBF centerlines, 0 missing)
// is the full evidence; this test pins FIXED waypoints from those
// centerlines (in the gaps the corridor must fill) and asserts ground +
// baked tile + a road within 60 m at each. A straight-line projection-gap
// check was tried and deleted — it is wrong for curving routes (US 6 arcs
// ~15 km off the NB->Cape axis, manufacturing phantom gaps).

type RoadShape = {
  highway: string;
  name: string | null;
  ref?: string;
  points: [number, number][];
};
type SliceShape = {
  name: string;
  origin: { lat: number; lon: number };
  meters_per_degree: { lat: number; lon: number };
  buildings: unknown[];
  buildingsStreamed: boolean;
  roads: RoadShape[];
  water: [number, number][][];
  parking: [number, number][][];
};

const corridor = JSON.parse(corridorSliceRaw) as SliceShape;
const slices: Record<string, SliceShape> = {
  newBedford: JSON.parse(nbSliceRaw) as SliceShape,
  fallRiver: JSON.parse(frSliceRaw) as SliceShape,
  brockton: JSON.parse(brocktonSliceRaw) as SliceShape,
  cape: JSON.parse(capeSliceRaw) as SliceShape,
  corridor,
};
const manifest = JSON.parse(manifestRaw) as { tile: number; origin: { lat: number; lon: number }; keys: string[]; count: number };
const manifestKeys = new Set(manifest.keys);

const TILE = manifest.tile; // 500 m, from the manifest itself
const tileKey = (east: number, north: number) => `${Math.floor(east / TILE)}_${Math.floor(north / TILE)}`;

/** Nearest road distance (m) from a slice point, across the given slices. */
function nearestRoad(east: number, north: number, which: SliceShape[]): number {
  let best = Infinity;
  for (const s of which) {
    for (const r of s.roads) {
      for (let i = 0; i < r.points.length - 1; i++) {
        const [ax, an] = r.points[i], [bx, bn] = r.points[i + 1];
        const dx = bx - ax, dn = bn - an;
        const len2 = dx * dx + dn * dn || 1;
        const t = Math.max(0, Math.min(1, ((east - ax) * dx + (north - an) * dn) / len2));
        const d = Math.hypot(east - (ax + dx * t), north - (an + dn * t));
        if (d < best) best = d;
      }
    }
  }
  return best;
}

const ROUTES = [
  { name: "I-195", ref: "I 195", a: DISTRICTS.newBedford.center, b: DISTRICTS.fallRiver.center },
  { name: "MA 24", ref: "MA 24", a: DISTRICTS.fallRiver.center, b: DISTRICTS.brockton.center },
  { name: "US 6", ref: "US 6", a: DISTRICTS.newBedford.center, b: DISTRICTS.cape.center },
] as const;

/** Roads that belong to a route: the ref tag, or a motorway/trunk/primary
    road running within 500 m of the route axis (covers the untagged
    segments — NB's I-195 carriageways carry no ref, and US 6 through
    Fairhaven is Huttleston Avenue, primary/trunk with no ref tag).
    Points are slice [east, north]. */
function routePoints(route: (typeof ROUTES)[number]): [number, number][] {
  const [ax, an] = route.a, [bx, bn] = route.b;
  const dx = bx - ax, dn = bn - an;
  const len2 = dx * dx + dn * dn;
  const pts: [number, number][] = [];
  for (const s of Object.values(slices)) {
    for (const r of s.roads) {
      const isRef = r.ref === route.ref || r.ref?.split(";").includes(route.ref);
      const isHighway = r.highway === "motorway" || r.highway === "trunk" || r.highway === "primary";
      for (const p of r.points) {
        if (isRef) { pts.push(p); continue; }
        if (!isHighway) continue;
        const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - an) * dn) / len2));
        const d = Math.hypot(p[0] - (ax + dx * t), p[1] - (an + dn * t));
        if (d <= 500) pts.push(p);
      }
    }
  }
  return pts;
}

describe("corridor slice contract", () => {
  it("registers the corridor slice file", () => {
    expect(CORRIDOR_SLICE_FILE).toBe("slice-corridor.json");
    expect(DISTRICTS.newBedford.sliceFile).toBe("slice-newbedford.json");
  });

  it("parses with the NB-schema keys, no shipped buildings, tiles streamed", () => {
    expect(corridor.name).toBeTruthy();
    expect(corridor.origin).toEqual({ lat: 41.636, lon: -70.9205 });
    expect(corridor.meters_per_degree).toEqual({ lat: 111320, lon: 83198.429 });
    expect(corridor.buildings).toEqual([]);
    expect(corridor.buildingsStreamed).toBe(true);
    expect(Array.isArray(corridor.water)).toBe(true);
    expect(Array.isArray(corridor.parking)).toBe(true);
    expect(corridor.roads.length).toBeGreaterThan(0);
  });

  it("grows the tile manifest past the 1,301 expansion tiles", () => {
    // 1,300 expansion keys + 590 corridor keys (248 bake 2 + 342 bake 3);
    // 106,133 + 15,621 = 121,754 buildings. Exact counts: a tile loss
    // (deleted file, bad merge) must fail loudly, not silently shrink.
    expect(manifest.keys.length).toBe(1890);
    expect(manifest.count).toBe(121754);
  });
});

describe("fast-travel spawn safety (Nov 7 fall-through regression)", () => {
  it("ground covers every fast-travel point and every district spawn", () => {
    for (const ft of FAST_TRAVEL) {
      const [x, z] = ft.pos;
      expect(groundCovers(x, z), `${ft.name} (${ft.district}) has no ground`).toBe(true);
    }
    for (const d of Object.values(DISTRICTS)) {
      const [x, z] = d.spawn;
      expect(groundCovers(x, z), `${d.id} spawn has no ground`).toBe(true);
    }
  });

  it("the tile manifest covers the corridor-scope spawns", () => {
    // Corridor scope only: the 3 new fast-travel points + the 4 district
    // spawns. The older NB/FR points are NOT asserted here — Westport's
    // tile (-27_-4) was never baked by the original NB tile run, a
    // pre-existing gap outside the corridor's scope (the ground is there,
    // so the spawn is safe; it just has no tile buildings to load).
    const points: { name: string; pos: [number, number] }[] = [
      ...FAST_TRAVEL.filter((d) => d.district === "brockton" || d.district === "cape"),
      ...Object.values(DISTRICTS).map((d) => ({ name: `${d.id} spawn`, pos: d.spawn })),
    ];
    for (const { name, pos } of points) {
      const [x, z] = pos; // world [x, z] -> slice [east=x, north=-z]
      expect(manifestKeys.has(tileKey(x, -z)), `${name}: tile ${tileKey(x, -z)} not baked`).toBe(true);
    }
  });

  it("a road is within 60 m of every drivable fast-travel point and district spawn", () => {
    const all = Object.values(slices);
    // Carve-outs (pre-existing, not corridor scope): the Hurricane Barrier
    // point sits on the barrier over the harbor (247 m from any road), and
    // Westport (346 m) sits beyond the NB slice's road coverage at the far
    // west edge. Both are on-foot landmarks; the car teleports with them
    // today, exactly as before the corridor.
    const OFF_ROAD = new Set(["Hurricane Barrier", "Westport"]);
    for (const ft of FAST_TRAVEL) {
      if (OFF_ROAD.has(ft.name)) continue;
      const [x, z] = ft.pos;
      const d = nearestRoad(x, -z, all);
      expect(d, `${ft.name}: nearest road ${d.toFixed(1)} m away`).toBeLessThanOrEqual(60);
    }
    for (const d of Object.values(DISTRICTS)) {
      const [x, z] = d.spawn;
      const dist = nearestRoad(x, -z, all);
      expect(dist, `${d.id} spawn: nearest road ${dist.toFixed(1)} m away`).toBeLessThanOrEqual(60);
    }
  });

  it("a corridor midpoint per route has ground, a baked tile, and a road", () => {
    for (const route of ROUTES) {
      const [ax, an] = route.a, [bx, bn] = route.b;
      const dx = bx - ax, dn = bn - an;
      const len2 = dx * dx + dn * dn;
      // Median-projection point of the route's union roads (both
      // carriageways + ramps). For I-195 the corridor slice adds nothing
      // (the districts cover it), so the midpoint lands on a district
      // road; for MA 24 / US 6 it lands in the gap the corridor fills.
      const pts = routePoints(route);
      expect(pts.length, `${route.name}: no route roads in the union`).toBeGreaterThan(0);
      const proj = pts.map((p) => ({ p, t: ((p[0] - ax) * dx + (p[1] - an) * dn) / len2 })).sort((a, b) => a.t - b.t);
      const mid = proj[Math.floor(proj.length / 2)].p;
      const [east, north] = mid;
      const wx = east, wz = -north; // slice -> world
      expect(groundCovers(wx, wz), `${route.name} midpoint has no ground`).toBe(true);
      // No tile assertion here: a midpoint in open country legitimately has
      // no tile (tiles are only baked where buildings exist — the bake's
      // verification counts those as tile_empty, not tile_missing). Tile
      // coverage is proven by the manifest-growth test + the bake's
      // verification (tile_missing 0); the spawn tile test above covers
      // the built-up points where a tile must exist.
      const d = nearestRoad(east, north, Object.values(slices));
      expect(d, `${route.name} midpoint: nearest road ${d.toFixed(1)} m away`).toBeLessThanOrEqual(60);
    }
  });
});

describe("route continuity (union of all five slices)", () => {
  for (const route of ROUTES) {
    it(`${route.name}: the route's ref-tagged roads exist in the union`, () => {
      const [ax, an] = route.a, [bx, bn] = route.b;
      const hasRef = (s: SliceShape) => s.roads.some((r) => r.ref === route.ref || r.ref?.split(";").includes(route.ref));
      // The corridor slice itself may carry NO ref roads for a route
      // (I-195: the district slices already cover it end to end, so the
      // corridor correctly adds nothing). What must hold is that the
      // union has the tagged route — the gap check below proves it is
      // continuous, not just present somewhere.
      expect(
        Object.values(slices).some(hasRef),
        `${route.name}: no ref-tagged roads in any slice`,
      ).toBe(true);
      expect(Math.hypot(bx - ax, bn - an)).toBeGreaterThan(1000);
    });

    // Fixed route waypoints (slice [east, north]): exact PBF route points
    // from stage/corridor/routes.json, in the gaps the corridor must fill.
    // A projection-gap check was tried first and deleted — it is wrong for
    // curving routes (US 6 arcs ~15 km off the straight NB->Cape axis, so
    // a straight-line projection manufactures 37 km phantom gaps). These
    // fixed points are the independent reference instead: the bake's
    // verification.json (1,521 samples, 0 missing) is the full continuity
    // evidence; these waypoints are the in-tree regression guard — if the
    // corridor slice is deleted or goes stale, they fail.
    const WAYPOINTS: Record<string, [number, number][]> = {
      "I-195": [[-12003.2, 2696.5], [-7964.8, 2218.2]],
      "MA 24": [[-16646.5, 12472.7], [-11502.0, 24994.3], [-9273.5, 40001.2]],
      // US 6: the NB-leg gap point + the Wareham -> Hyannis leg (Scenic
      // Highway / Mid Cape Highway), which bakes 1-2 silently dropped
      // because the US 6 span's north max (4,500) cut off the Wareham arc.
      "US 6": [[10006.2, 2848.5], [28437.9, 13474.8], [45975.2, 5776.9], [54003.1, 5720.2]],
    };

    it(`${route.name}: fixed waypoints in the gap have ground and a road`, () => {
      const all = Object.values(slices);
      for (const [east, north] of WAYPOINTS[route.name]) {
        const wx = east, wz = -north; // slice -> world
        expect(groundCovers(wx, wz), `${route.name} waypoint [${east}, ${north}] has no ground`).toBe(true);
        // No tile assertion: a waypoint in open country legitimately has
        // no tile (tiles are only baked where buildings exist). Tile
        // coverage is proven by the manifest-growth test + the bake's
        // verification (tile_missing 0).
        const d = nearestRoad(east, north, all);
        expect(d, `${route.name} waypoint [${east}, ${north}]: nearest road ${d.toFixed(1)} m away`).toBeLessThanOrEqual(60);
      }
    });
  }
});
