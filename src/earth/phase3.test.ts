import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SLICE_ORIGIN } from "./geo";
import { scanRoutes } from "./rebase";
import { applyImpact, powerFor, repairBill } from "./damage";
import { bedFor } from "./ambience";
import { advanceJob, currentJob, loadJobs, resetJobs, startJob } from "./jobs";
import { followRoad, roadblockPoint, stepLanes, type LaneState } from "./traffic";
import { capsForTier, memoryBand, nextQuality } from "./quality";
import { formatCrash, redactSecrets } from "./crashReport";
import { loadSettings, saveSettings } from "./controls";
import { parseEarthLocal } from "./earthLocal";
import { TILE_MEMORY } from "./tileCaps";

describe("budgeted route scan", () => {
  const roads = Array.from({ length: 80 }, (_, i) => ({
    highway: i === 10 ? "footway" : "residential",
    points: [[i * 30, 0], [i * 30, 40]] as [number, number][],
  }));

  it("walks only the budget and continues on the next call", () => {
    const first = scanRoutes(roads, SLICE_ORIGIN, new Set(), 0, 36);
    expect(first.next).toBe(36);
    const second = scanRoutes(roads, SLICE_ORIGIN, new Set(first.routes.map((r) => r.roadIndex)), first.next, 36);
    expect(second.next).toBe(72);
    expect(first.routes.some((r) => r.roadIndex === 10)).toBe(false);
    const far = scanRoutes(
      [{ highway: "primary", points: [[9000, 0], [9100, 0]] }],
      SLICE_ORIGIN,
      new Set(),
      0,
      4,
    );
    expect(far.routes).toEqual([]);
  });
});

describe("lane traffic and roadblocks", () => {
  const east = { pts: [{ x: 0, z: 0 }, { x: 0, z: 100 }], total: 100 };
  const north = { pts: [{ x: 0, z: 100 }, { x: 40, z: 100 }], total: 40 };

  it("joins a road that meets the one it is leaving", () => {
    const car: LaneState = { route: 0, dist: 96, dir: 1, hold: 0 };
    stepLanes([car], [east, north], 0.5, 10);
    expect(car.route).toBe(1);
    expect(car.dir).toBe(1);
    expect(car.dist).toBe(0);
  });

  it("yields to the car closer to the join and turns around when the road ends", () => {
    const lead: LaneState = { route: 0, dist: 97, dir: 1, hold: 0 };
    const trail: LaneState = { route: 0, dist: 94, dir: 1, hold: 0 };
    stepLanes([lead, trail], [east], 0.2, 10);
    expect(trail.hold).toBeGreaterThan(0);
    const solo: LaneState = { route: 0, dist: 96, dir: 1, hold: 0 };
    stepLanes([solo], [east], 0.5, 20);
    expect(solo.dir).toBe(-1);
    expect(solo.dist).toBe(0);
  });

  it("follows the road toward a target and parks a block across the lane", () => {
    const moved = followRoad([east], 0, 0, 0, 0, 100, 0.5, 10);
    expect(moved.z).toBeCloseTo(5, 4);
    const block = roadblockPoint([{ pts: [{ x: 0, z: 0 }, { x: 0, z: 40 }, { x: 0, z: 100 }], total: 100 }], 0, 0, 0, 45);
    expect(block).not.toBeNull();
    expect(block!.z).toBeCloseTo(40, 4);
    expect(block!.yaw).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe("damage, beds, and jobs", () => {
  it("spends condition on a hard hit and bills the repair", () => {
    expect(applyImpact({ body: 100, engine: 100 }, 4)).toEqual({ body: 100, engine: 100 });
    const hit = applyImpact({ body: 100, engine: 100 }, 20);
    expect(hit.body).toBeLessThan(100);
    expect(hit.engine).toBeLessThan(100);
    expect(repairBill(hit.body, hit.engine)).toBeGreaterThan(0);
    expect(powerFor(100)).toBe(1);
    expect(powerFor(0)).toBe(0.15);
  });

  it("picks a bed from the region and the speed", () => {
    expect(bedFor("fallRiver", 5, false)).toBe("mill");
    expect(bedFor("newBedford", 5, false)).toBe("harbor");
    expect(bedFor("cape", 5, false)).toBe("cape");
    expect(bedFor("brockton", 5, false)).toBe("city");
    expect(bedFor("southCoast", 5, false)).toBe("harbor");
    expect(bedFor("cape", 4, true)).toBe("highway");
    expect(bedFor("fallRiver", 22, false)).toBe("highway");
  });

  it("runs one regional chain at a time and round-trips the save", () => {
    resetJobs();
    expect(startJob("fr-quequechan")).toBe(true);
    expect(startJob("cape-canal")).toBe(false);
    expect(currentJob()?.step.text).toContain("Narrows");
    advanceJob();
    advanceJob();
    const last = advanceJob();
    expect(last?.finished).toBe(true);
    expect(last?.reward).toBe(250);
    expect(currentJob()).toBeNull();
    const snap = { jobId: "nb-whaling", jobStep: 1, jobsDone: ["fr-quequechan", "nope"] };
    loadJobs(snap);
    expect(currentJob()?.job.id).toBe("nb-whaling");
    expect(currentJob()?.index).toBe(1);
    resetJobs();
  });
});

describe("quality, crash text, and settings", () => {
  it("steps quality down on slow frames and forces low on a critical heap", () => {
    expect(memoryBand(null, null)).toBe("ok");
    expect(memoryBand(90, 100)).toBe("critical");
    expect(memoryBand(75, 100)).toBe("tight");
    expect(nextQuality("high", 0.05, 60, "ok", false)).toBe("medium");
    expect(nextQuality("medium", 0.01, 180, "ok", false)).toBe("high");
    expect(nextQuality("high", 0.05, 60, "ok", true)).toBe("high");
    expect(nextQuality("high", 0.01, 180, "critical", true)).toBe("low");
    expect(capsForTier("low").errorTarget).toBe(48);
    expect(capsForTier("high").maxDepth).toBe(TILE_MEMORY.maxDepth);
    expect(TILE_MEMORY.errorTarget).toBe(32);
  });

  it("redacts keys from a crash report", () => {
    const key = "AIzaSyABCDEFGHIJKLMNOPQRSTUV";
    const text = formatCrash("boom " + key, "at foo\n".repeat(12), `https://quahog.fullstackassets.com/earth.html?key=${key}`);
    expect(text).not.toContain(key);
    expect(text).toContain("quahog.fullstackassets.com/earth.html");
    expect(text.split("\n").length).toBeLessThan(14);
    expect(redactSecrets("token " + "a".repeat(50))).toContain("[token]");
  });

  it("keeps an old volume-only settings blob", () => {
    const memory = new Map<string, string>();
    const store = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => { memory.set(k, v); },
    };
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
    memory.set("mh.earth.settings.v1", JSON.stringify({ volume: 0.2 }));
    expect(loadSettings().volume).toBe(0.2);
    expect(loadSettings().quality).toBe("auto");
    expect(loadSettings().showPerf).toBe(true);
    saveSettings({ ...loadSettings(), subtitleScale: 1.5, colorblind: true });
    expect(loadSettings().volume).toBe(0.2);
    expect(loadSettings().subtitleScale).toBe(1.5);
    expect(loadSettings().colorblind).toBe(true);
    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });

  it("accepts a save with no job fields and ignores an unknown job", () => {
    const plain = parseEarthLocal({ placeId: "battleship-cove", x: 1, z: 2, heading: 0 });
    expect(plain?.jobId).toBeUndefined();
    const unknown = parseEarthLocal({ placeId: "battleship-cove", x: 1, z: 2, heading: 0, jobId: "nope", jobsDone: ["fr-quequechan"] });
    expect(unknown?.jobId).toBeUndefined();
    expect(unknown?.jobsDone).toEqual(["fr-quequechan"]);
  });

  it("does not rebuild the whole road list inside the rebase shift", () => {
    const src = readFileSync(new URL("./PlayWorld.tsx", import.meta.url), "utf8");
    expect(src).toContain("scanRoutes(");
    expect(src).not.toContain("routesNear(");
  });
});
