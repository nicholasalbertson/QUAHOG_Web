import { describe, expect, it } from "vitest";
import type { Road } from "../slice";
import {
  buildRoadIndex,
  junctionPoints,
  roadEndDegrees,
  trimRoadEndsAtJunctions,
} from "../world/placement";

// Dressing cut (2026-11-07): the shared placement guards — the cross-road
// check that keeps dressing out of drivable streets, and the junction
// detection + ribbon trim for defects 1/4. Synthetic fixtures throughout.

const road = (
  highway: string,
  name: string | null,
  points: [number, number][],
  width = 8,
): Road => ({ highway, name, points, width });

// A 4-way junction at (0, 10): both roads split at the crossing so 4 ends meet.
const junctionRoads = (): Road[] => [
  road("primary", "Main St", [[-100, 10], [0, 10]], 12),
  road("primary", "Main St", [[0, 10], [100, 10]], 12),
  road("residential", "Side St", [[0, -100], [0, 10]], 7),
  road("residential", "Side St", [[0, 10], [0, 100]], 7),
];

describe("buildRoadIndex — the cross-road check", () => {
  it("flags points inside a drivable carriageway, clears the curb", () => {
    const idx = buildRoadIndex([road("primary", "Main St", [[0, 10], [100, 10]], 12)]);
    expect(idx.inDrivableRoadway(50, -10)).toBe(true); // on the centerline
    expect(idx.inDrivableRoadway(50, -15)).toBe(true); // 5 m off, inside half-width 6
    expect(idx.inDrivableRoadway(50, -3)).toBe(false); // 7 m off, past the curb
    expect(idx.inDrivableRoadway(50, -3, 2)).toBe(true); // margin pulls it back in
  });
  it("does NOT flag footways/pedestrian areas as drivable streets", () => {
    const idx = buildRoadIndex([
      road("footway", null, [[0, 20], [100, 20]], 2.5),
      road("pedestrian", null, [[0, 30], [100, 30]], 6),
    ]);
    expect(idx.inDrivableRoadway(50, -20)).toBe(false);
    expect(idx.inDrivableRoadway(50, -30)).toBe(false);
  });
  it("flags a point on a CROSSING road, not just its own road", () => {
    // The defect-1 mechanism: an offset point from road A lands on road B.
    const idx = buildRoadIndex(junctionRoads());
    // 8 m north of Main St (outside its 6 m half-width) but ON Side St's
    // carriageway (x=0, half-width 3.5) — only the crossing road catches it.
    expect(idx.inDrivableRoadway(0, -18)).toBe(true);
    // same lateral offset but away from Side St: clear of everything
    expect(idx.inDrivableRoadway(50, -18)).toBe(false);
  });
});

describe("junction detection", () => {
  it("finds a real junction where 4 road ends meet", () => {
    const pts = junctionPoints(junctionRoads());
    expect(pts).toHaveLength(1);
    expect(pts[0]).toEqual({ x: 0, z: -10 });
  });
  it("does NOT call a through-crossing a junction (no road ends there)", () => {
    const through = [
      road("primary", "Main St", [[-100, 10], [100, 10]], 12),
      road("residential", "Side St", [[0, -100], [0, 100]], 7),
    ];
    expect(junctionPoints(through)).toHaveLength(0);
    // degree 2 = way-split continuation, not a junction
    const deg = roadEndDegrees(through);
    expect(deg.get("0_3") ?? 0).toBe(0);
  });
});

describe("trimRoadEndsAtJunctions — defect 4", () => {
  it("trims junction ends 2 m back, leaves dead ends and continuations alone", () => {
    const roads = [
      ...junctionRoads(),
      road("residential", "Dead End", [[200, 0], [300, 0]], 7),
      road("residential", "Split A", [[-200, 50], [0, 50]], 7),
      road("residential", "Split A", [[0, 50], [200, 50]], 7),
    ];
    const trimmed = trimRoadEndsAtJunctions(roads, 2);
    // junction ends pulled back 2 m along their road
    expect(trimmed[0].points).toEqual([[-100, 10], [-2, 10]]);
    expect(trimmed[1].points).toEqual([[2, 10], [100, 10]]);
    expect(trimmed[2].points).toEqual([[0, -100], [0, 8]]);
    expect(trimmed[3].points).toEqual([[0, 12], [0, 100]]);
    // dead end untouched
    expect(trimmed[4].points).toEqual([[200, 0], [300, 0]]);
    // way-split continuation (degree 2) untouched — trimming there would
    // open a gap in the middle of the street
    expect(trimmed[5].points).toEqual([[-200, 50], [0, 50]]);
    expect(trimmed[6].points).toEqual([[0, 50], [200, 50]]);
  });
  it("never mangles a road shorter than the trim", () => {
    const tiny = [road("residential", "Alley", [[0, 0], [1, 0]], 4)];
    // single road: both ends degree 1 (dead ends) — untouched anyway
    expect(trimRoadEndsAtJunctions(tiny, 2)[0].points).toEqual([[0, 0], [1, 0]]);
  });
});
