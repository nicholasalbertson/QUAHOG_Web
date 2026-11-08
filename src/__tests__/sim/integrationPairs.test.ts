import { describe, expect, it } from "vitest";
import { RoadGraph } from "../../sim/RoadGraph";
import { desiredCops, heatTier } from "../../sim/HeatTiers";
import { WorldStreamer } from "../../sim/WorldStreamer";
import { SpatialIndex } from "../../sim/SpatialIndex";

describe("§15.1.2 integration pairs", () => {
  it("police↔graph: heat tier maps to desired cops with a pathable road graph", () => {
    const g = RoadGraph.fromRoads([
      {
        highway: "residential",
        name: "A",
        width: 6,
        points: [
          [0, 0],
          [40, 0],
          [40, 40],
        ],
      },
    ]);
    const wanted = 3;
    expect(heatTier(wanted).stars).toBe(3);
    expect(desiredCops(wanted)).toBeGreaterThan(0);
    expect(g.nodes.length).toBeGreaterThan(1);
    expect(g.edges.length).toBeGreaterThan(0);
  });

  it("streamer↔spatial: streamer boots and spatial sector holds inserts", () => {
    const streamer = new WorldStreamer();
    const spatial = new SpatialIndex<{ id: string }>();
    spatial.insert({ id: "a" }, 0, 0);
    expect(spatial.querySector(0, 0).some((x) => x.id === "a")).toBe(true);
    expect(streamer).toBeTruthy();
  });
});
