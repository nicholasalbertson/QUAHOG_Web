import { describe, expect, it } from "vitest";
import nbSliceRaw from "../../public/slice-newbedford.json?raw";
import type { Road, Slice } from "../slice";
import { prepareRoads } from "../world/roadPrep";
import {
  STREET_RADIUS_M,
  StreetIndex,
  StreetLabelTracker,
  distanceToRoad,
  districtTown,
  roadClassRank,
} from "../ui/streetLabel";

// Live HUD street + town label (wayfinding §B.3). World coords in,
// street name out; slice coords are [east, north] with world z = -north.

const road = (name: string | null, highway: string, points: [number, number][]): Road => ({
  highway,
  width: 7,
  name,
  points,
});

describe("districtTown", () => {
  it("maps every district to its display town", () => {
    expect(districtTown("newBedford")).toBe("New Bedford");
    expect(districtTown("fallRiver")).toBe("Fall River");
    expect(districtTown("brockton")).toBe("Brockton");
    // The Cape slice is Hyannis — never "Cape Cod" as a town label.
    expect(districtTown("cape")).toBe("Hyannis");
  });
});

describe("roadClassRank", () => {
  it("ranks drivable classes above footways", () => {
    expect(roadClassRank("residential")).toBeLessThan(roadClassRank("footway"));
    expect(roadClassRank("primary")).toBeLessThan(roadClassRank("residential"));
    expect(roadClassRank("service")).toBeLessThan(roadClassRank("path"));
  });
});

describe("StreetIndex", () => {
  // Two parallel named streets (slice coords: north = -world z) plus one
  // unnamed road between them.
  const roads = [
    road("First Street", "residential", [[-100, 0], [100, 0]]),
    road("Second Street", "residential", [[-100, 30], [100, 30]]),
    road(null, "residential", [[-100, 10], [100, 10]]),
  ];

  it("picks the nearest named road", () => {
    const idx = new StreetIndex(roads);
    expect(idx.nearest(0, 2)?.road.name).toBe("First Street");
    expect(idx.nearest(0, 25)?.road.name).toBe("Second Street");
  });

  it("never returns an unnamed road, even when it is closer", () => {
    const idx = new StreetIndex(roads);
    // north=12: unnamed road is 2 m away, but the nearest NAMED road is
    // First Street at 12 m — the unnamed one must never display.
    expect(idx.nearest(0, 12)?.road.name).toBe("First Street");
    expect(idx.roadCount).toBe(2); // unnamed road is not indexed at all
  });

  it("returns null beyond the radius", () => {
    const idx = new StreetIndex(roads);
    expect(idx.nearest(0, 30 + STREET_RADIUS_M + 1)).toBeNull();
  });

  it("tie-breaks a near-tie toward the drivable class", () => {
    const cross = [
      road("Main Street", "residential", [[-100, 0], [100, 0]]),
      road("Boardwalk", "footway", [[0, -100], [0, 100]]),
    ];
    const idx = new StreetIndex(cross);
    // At the crossing both are 0 m away — the residential street wins.
    expect(idx.nearest(0, 0)?.road.name).toBe("Main Street");
  });

  it("matches brute force on synthetic data", () => {
    const idx = new StreetIndex(roads);
    const brute = (east: number, north: number) => {
      let best: { name: string | null; d: number } | null = null;
      for (const r of roads) {
        if (!r.name) continue;
        const d = distanceToRoad(r, east, north);
        if (d <= STREET_RADIUS_M && (!best || d < best.d)) best = { name: r.name, d };
      }
      return best?.name ?? null;
    };
    for (const [east, north] of [[0, 2], [0, 12], [0, 25], [-50, -5], [80, 45], [0, 100]] as const) {
      expect(idx.nearest(east, north)?.road.name ?? null).toBe(brute(east, north));
    }
  });
});

describe("StreetLabelTracker hysteresis", () => {
  const roads = [
    road("First Street", "residential", [[-100, 0], [100, 0]]),
    road("Second Street", "residential", [[-100, 20], [100, 20]]),
  ];
  // World z = -north, so north N is z = -N.
  it("holds the current street at a junction until the new one is clearly nearer", () => {
    const t = new StreetLabelTracker();
    expect(t.update(roads, 0, -2)).toBe("First Street"); // north 2
    // north 11: Second is 9 m away, First is 11 m — not >5 m nearer, hold.
    expect(t.update(roads, 0, -11)).toBe("First Street");
    // north 14: Second is 6 m, First is 14 m — 8 m nearer, switch.
    expect(t.update(roads, 0, -14)).toBe("Second Street");
  });

  it("switches when the current street is far away even without a 5 m margin", () => {
    // B sits 56 m from A: at north 30 the current street is 30 m away
    // (>25) while B is 26 m — only 4 m nearer, so the margin rule alone
    // would NOT switch; the drop rule must.
    const wide = [
      road("First Street", "residential", [[-100, 0], [100, 0]]),
      road("Second Street", "residential", [[-100, 56], [100, 56]]),
    ];
    const t = new StreetLabelTracker();
    expect(t.update(wide, 0, -2)).toBe("First Street"); // north 2
    expect(t.update(wide, 0, -30)).toBe("Second Street"); // north 30
  });

  it("clears the street off-road and re-adopts on return", () => {
    const t = new StreetLabelTracker();
    expect(t.update(roads, 0, -2)).toBe("First Street");
    expect(t.update(roads, 0, -100)).toBeNull();
    expect(t.update(roads, 0, -21)).toBe("Second Street");
  });

  it("ignores sub-2 m moves without changing the label", () => {
    const t = new StreetLabelTracker();
    expect(t.update(roads, 0, -2)).toBe("First Street");
    expect(t.update(roads, 0, -3.5)).toBe("First Street");
  });
});

describe("StreetIndex on the shipped New Bedford slice", () => {
  const slice = JSON.parse(nbSliceRaw) as Slice;
  const live = prepareRoads(slice.roads, slice.water ?? [], slice.landmarks.map((l) => l.name), "newBedford");

  it("indexes the live named roads and matches brute force", () => {
    const idx = new StreetIndex(live);
    expect(idx.roadCount).toBeGreaterThan(1000);
    expect(idx.segmentCount).toBeGreaterThan(idx.roadCount);
    const brute = (east: number, north: number) => {
      let best: { name: string | null; d: number } | null = null;
      for (const r of live) {
        if (!r.name) continue;
        const d = distanceToRoad(r, east, north);
        if (d <= STREET_RADIUS_M && (!best || d < best.d)) best = { name: r.name, d };
      }
      return best?.name ?? null;
    };
    for (const [east, north] of [[-256, -107], [-505, 927], [-380, -180], [0, 0], [-1000, 500]] as const) {
      expect(idx.nearest(east, north)?.road.name ?? null).toBe(brute(east, north));
    }
  });

  it("resolves the spawn street and a downtown avenue", () => {
    const t = new StreetLabelTracker();
    // Spawn: world (-256.2, 106.5) -> slice (-256.2, -106.5).
    expect(t.update(live, -256.2, 106.5)).toBe("Johnny Cake Hill");
    // On Acushnet Avenue downtown: slice (-505, 927) -> world (-505, -927).
    expect(t.update(live, -505, -927)).toBe("Acushnet Avenue");
  });

  it("builds the index and answers queries fast", () => {
    const start = performance.now();
    const idx = new StreetIndex(live);
    const buildMs = performance.now() - start;
    const q0 = performance.now();
    for (let i = 0; i < 200; i++) {
      idx.nearest(-600 + (i % 20) * 60, -200 + Math.floor(i / 20) * 60);
    }
    const queryMs = performance.now() - q0;
    expect(buildMs).toBeLessThan(500);
    expect(queryMs).toBeLessThan(500);
  });
});
