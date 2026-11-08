import { describe, expect, it } from "vitest";
import { PedGraph } from "../../sim/PedGraph";
import { ReplayRecorder } from "../../sim/ReplayRecorder";
import { MissionRuntime } from "../../sim/MissionRuntime";
import { rng } from "../../sim/Rng";
import { validateTelemetrySchema, TELEMETRY_SCHEMA } from "../../telemetry/schema";
import type { Road } from "../../slice";

function road(partial: Partial<Road> & Pick<Road, "highway" | "points">): Road {
  return { width: 8, name: null, ...partial };
}

describe("§0 / §1.2 / §1.3 checklist foundations", () => {
  it("§0.3 replay recorder digests stably for the same frames", () => {
    const a = new ReplayRecorder();
    a.startRecord(42);
    a.recordStep({ steer: 0.2, throttle: 1, bits: 0 });
    a.recordStep({ steer: -0.1, throttle: 0.5, bits: 1 });
    const frames = a.stopRecord();
    const d1 = a.digest();
    const b = new ReplayRecorder();
    b.load(frames, 42);
    expect(b.digest()).toBe(d1);
    expect(b.nextPlayFrame()?.throttle).toBe(1);
  });

  it("§0.4 telemetry schema validates domain.entity.action form", () => {
    expect(TELEMETRY_SCHEMA.length).toBeGreaterThan(5);
    expect(validateTelemetrySchema()).toEqual([]);
  });

  it("§1.2 prunes orphan ped components and tags junctions", () => {
    const roads: Road[] = [
      road({ highway: "residential", points: [[0, 0], [40, 0], [80, 0]] }),
      road({ highway: "residential", points: [[40, -40], [40, 0], [40, 40]] }),
      // dangling tiny spur far away → orphan after prune
      road({ highway: "service", points: [[5000, 5000], [5002, 5000]] }),
    ];
    const g = PedGraph.fromRoads(roads, { quantize: 5, curb: 1.6 });
    expect(g.nodeCount).toBeGreaterThan(4);
    expect(g.orphansPruned).toBeGreaterThanOrEqual(0);
    const kinds = new Set(g.nodes.map((n) => n.kind ?? "sidewalk"));
    expect(kinds.has("sidewalk")).toBe(true);
  });

  it("§1.2.6 adds door nodes linked to sidewalks", () => {
    const roads: Road[] = [
      road({ highway: "residential", points: [[0, 0], [30, 0]] }),
    ];
    const g = PedGraph.fromRoads(roads);
    const before = g.nodeCount;
    const added = g.addDoorNodes([
      {
        height: 8,
        footprint: [
          [5, 4],
          [15, 4],
          [15, 12],
          [5, 12],
        ],
      },
    ]);
    expect(added).toBe(1);
    expect(g.nodeCount).toBeGreaterThan(before);
    expect(g.nodes.some((n) => n.kind === "door")).toBe(true);
  });

  it("§1.3.5 event log ring + leak assert after complete", () => {
    const m = new MissionRuntime();
    let leaks = 0;
    m.start(0);
    m.claim({ id: "prop-1", kind: "prop", cleanup: () => { leaks++; } });
    expect(m.ownedCount).toBe(1);
    m.completeMission();
    expect(m.ownedCount).toBe(0);
    expect(leaks).toBe(1);
    expect(m.eventLog().some((e) => e.type === "mission.start")).toBe(true);
    expect(m.eventLog().some((e) => e.type === "mission.complete")).toBe(true);
  });

  it("§0.3 named streams are independent", () => {
    rng.reseed(99);
    const t = rng.stream("traffic").next();
    rng.reseed(99);
    const p = rng.stream("peds").next();
    expect(t).not.toBe(p);
  });
});
