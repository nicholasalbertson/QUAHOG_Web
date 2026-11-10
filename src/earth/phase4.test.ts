import { describe, expect, it } from "vitest";
import { SLICE_ORIGIN } from "./geo";
import { scanRoutes } from "./rebase";
import { controlKind, junctionsFromRoutes, laneCount, laneOffset, pedReaction, signalOpen } from "./signals";
import { stepLanes, type LaneState } from "./traffic";
import { advanceJob, chasePoint, currentLine, frontCost, jobUnlocked, loadJobs, resetJobs, startJob, tickJob } from "./jobs";
import { earnedCount, listAchievements } from "./achievements";
import { parseSlots, withActive } from "./slots";
import { nextHint, tutorialStep } from "./tutorial";
import { parseEarthLocal } from "./earthLocal";

describe("signals, lanes, and pedestrians", () => {
  it("uses an OSM control tag when the slice has one, otherwise the road class", () => {
    expect(controlKind([{ highway: "residential", control: "signal" }])).toBe("signal");
    expect(controlKind([{ highway: "motorway", ref: "I 195" }])).toBe("none");
    expect(controlKind([{ highway: "primary" }, { highway: "residential" }])).toBe("signal");
    expect(controlKind([{ highway: "residential" }, { highway: "residential" }])).toBe("stop");
    expect(laneCount({ highway: "motorway", ref: "I 195" })).toBe(2);
    expect(laneCount({ highway: "motorway", lanes: 3, ref: "I 195" })).toBe(3);
    expect(laneCount({ highway: "residential" })).toBe(1);
  });

  it("keeps a freeway's lane count through the budgeted scan", () => {
    const scanned = scanRoutes(
      [{ highway: "motorway", ref: "US 6", lanes: 3, points: [[0, 0], [0, 80]] as [number, number][] }],
      SLICE_ORIGIN,
      new Set(),
      0,
      4,
    );
    expect(scanned.routes[0]?.lanes).toBe(3);
    expect(laneOffset(0, 2)).toBeLessThan(0);
    expect(laneOffset(1, 2)).toBeGreaterThan(0);
  });

  it("stops a car at a stop-signed junction and lets it change lanes", () => {
    const road = { pts: [{ x: 0, z: 0 }, { x: 0, z: 40 }], total: 40, lanes: 2, highway: "primary" };
    const car: LaneState = { route: 0, dist: 20, dir: 1, hold: 0, lane: 0 };
    const lead: LaneState = { route: 0, dist: 30, dir: 1, hold: 0, lane: 0 };
    stepLanes([car, lead], [road], 0.2, 10);
    expect(car.lane).toBe(1);
    const stopping: LaneState = { route: 0, dist: 26, dir: 1, hold: 0, lane: 0 };
    const junction = junctionsFromRoutes([road, { pts: [{ x: 2, z: 40 }, { x: 30, z: 40 }], highway: "residential" }]);
    expect(junction[0]?.kind).toBe("signal");
    stepLanes([stopping], [road], 0.5, 20, 0, [{ id: 0, x: 0, z: 40, kind: "stop" }]);
    expect(stopping.hold).toBeGreaterThan(0);
    expect(signalOpen(0, 0, 0)).toBe(true);
    expect(signalOpen(0, 0, 1)).toBe(false);
  });

  it("steps a pedestrian aside from a closing car", () => {
    const reaction = pedReaction({ x: 2, z: 2 }, [{ x: 0, z: 0, heading: Math.atan2(2, 2), speed: 8 }]);
    expect(reaction.mode).toBe("step");
    const far = pedReaction({ x: 30, z: 0 }, [{ x: 0, z: 0, heading: 0, speed: 8 }]);
    expect(far.mode).toBe("walk");
  });
});

describe("campaign, slots, and the first drive", () => {
  it("locks later chapters, speaks a line, and retries a blown timer", () => {
    resetJobs();
    expect(jobUnlocked("fr-quequechan")).toBe(true);
    expect(jobUnlocked("nb-whaling")).toBe(false);
    expect(startJob("nb-whaling")).toBe(false);
    expect(startJob("fr-quequechan")).toBe(true);
    expect(currentLine()?.who).toBe("Mira Costa");
    const moved = chasePoint({ text: "", lat: 10, lon: 20, radius: 1, kind: "chase", fromLat: 0, fromLon: 0, limitSec: 10 }, 5);
    expect(moved.lat).toBeCloseTo(5);
    expect(tickJob(10, 0)).toBe("ok");
    loadJobs({ jobId: "nb-whaling", jobStep: 3, jobsDone: ["fr-quequechan"] });
    expect(tickJob(300, 0)).toBe("fail");
    expect(frontCost("narrowscafe", 650, ["narrowscafe"])).toBe(325);
    resetJobs();
  });

  it("pays the Fall River chapter and records the career", () => {
    resetJobs();
    startJob("fr-quequechan");
    let last = advanceJob();
    for (let i = 0; i < 6 && last && !last.finished; i++) last = advanceJob();
    expect(last?.finished).toBe(true);
    expect(last?.reward).toBe(250);
    const earned = listAchievements({
      career: { seconds: 10, meters: 6000, drove: true, repairs: 0 },
      jobsDone: ["fr-quequechan"],
      ownedFronts: 1,
      heatSeen: false,
    });
    expect(earnedCount({
      career: { seconds: 10, meters: 6000, drove: true, repairs: 0 },
      jobsDone: ["fr-quequechan"],
      ownedFronts: 1,
      heatSeen: false,
    })).toBeGreaterThan(2);
    expect(earned.find((row) => row.id === "distance")?.earned).toBe(true);
    resetJobs();
  });

  it("keeps three slots and an old save with no career fields", () => {
    const file = withActive(parseSlots(null), 1, { placeId: "the-narrows", x: 1, z: 2, heading: 0 });
    expect(file.active).toBe(1);
    expect(file.slots[1]?.placeId).toBe("the-narrows");
    expect(file.slots[0]).toBeNull();
    const plain = parseEarthLocal({ placeId: "battleship-cove", x: 1, z: 2, heading: 0, careerMeters: 12 });
    expect(plain?.careerMeters).toBe(12);
  });

  it("walks the tutorial and shows a repair hint once", () => {
    expect(tutorialStep({ moved: false, drove: false, mapped: false, dismissed: false })?.id).toBe("walk");
    expect(tutorialStep({ moved: true, drove: true, mapped: false, dismissed: false })?.id).toBe("map");
    expect(tutorialStep({ moved: true, drove: true, mapped: true, dismissed: false })).toBeNull();
    const hint = nextHint({ damaged: true, heat: false, driving: true }, []);
    expect(hint?.id).toBe("repair");
    expect(nextHint({ damaged: true, heat: false, driving: true }, ["repair"])?.id).not.toBe("repair");
  });
});
