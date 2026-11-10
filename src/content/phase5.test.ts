import { readFileSync } from "node:fs";
import { describe, expect, it, afterEach } from "vitest";
import { REGION_JOBS } from "../earth/jobs";
import { acceptSide, resetActivities, sidePrompt, tickSide } from "./activities";
import { discoveryFound, noteDiscovery, resetDiscovery } from "./discovery";
import { isAppShellRequest, isGoogleTileRequest } from "../pwa/cachePolicy";
import { lodCount } from "../perf/lod";

afterEach(() => {
  resetActivities();
  resetDiscovery();
});

describe("chapter endings", () => {
  it("gives every chapter at least four steps and a closing line", () => {
    for (const job of REGION_JOBS) {
      expect(job.steps.length, job.id).toBeGreaterThanOrEqual(4);
      expect(job.steps[job.steps.length - 1]?.text.startsWith("Ending:"), job.id).toBe(true);
    }
    const whaling = REGION_JOBS.find((job) => job.id === "nb-whaling");
    expect(whaling?.steps[3]?.kind).toBe("escape");
    expect(whaling?.steps[3]?.limitSec).toBe(240);
  });
});

describe("fares, races, and landmarks", () => {
  it("offers a fare at The Narrows and pays it at the Cove", () => {
    expect(sidePrompt(41.7028, -71.1575, false)?.kind).toBe("fare-offer");
    expect(acceptSide(41.7028, -71.1575, false)).toBe(true);
    expect(tickSide(41.7028, -71.1575, true, 1)).toEqual([]);
    const paid = tickSide(41.7044, -71.1641, true, 1);
    expect(paid[0]).toMatchObject({ type: "paid", cash: 80 });
    expect(sidePrompt(41.7044, -71.1641, true)?.kind).toBe("race-offer");
  });

  it("runs the canal gates only while driving", () => {
    expect(acceptSide(41.7476, -70.5902, true)).toBe(true);
    expect(tickSide(41.76, -70.57, false, 1)[0]?.type).toBe("failed");
    resetActivities();
    acceptSide(41.7476, -70.5902, true);
    expect(tickSide(41.76, -70.57, true, 1)).toEqual([]);
    const paid = tickSide(41.7746, -70.5428, true, 1);
    expect(paid[0]).toMatchObject({ type: "paid", cash: 400 });
  });

  it("records a landmark once", () => {
    expect(noteDiscovery(41.6355, -70.9233)).toEqual(["Whaling Museum"]);
    expect(noteDiscovery(41.6355, -70.9233)).toEqual([]);
    expect(discoveryFound()).toEqual(["whaling-museum"]);
    expect(noteDiscovery(41.7047, -71.1569)).toContain("Braga Bridge");
    expect(discoveryFound()).toEqual(["braga-bridge", "whaling-museum"]);
  });
});

describe("app shell cache", () => {
  const origin = "https://quahog.fullstackassets.com";

  it("refuses Google tile hosts and keeps the boot files", () => {
    expect(isGoogleTileRequest("https://tile.googleapis.com/v1/3dtiles/root.json?key=abc")).toBe(true);
    expect(isGoogleTileRequest("https://maps.googleapis.com/v1/3dtiles/datasets/x/files/a.glb?session=s")).toBe(true);
    expect(isGoogleTileRequest(`${origin}/v1/3dtiles/datasets/x/files/a.glb`)).toBe(true);
    expect(isAppShellRequest("https://tile.googleapis.com/v1/3dtiles/root.json", origin)).toBe(false);
    expect(isAppShellRequest(`${origin}/tiles-key.json`, origin)).toBe(false);
    expect(isAppShellRequest(`${origin}/slice-newbedford.json`, origin)).toBe(false);
    expect(isAppShellRequest(`${origin}/assets/app.js`, origin)).toBe(true);
    expect(isAppShellRequest(`${origin}/earth.html`, origin)).toBe(true);
  });

  it("keeps the worker from storing tile.googleapis.com", () => {
    const sw = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
    expect(sw).toContain("tile.googleapis.com");
    expect(sw).toContain("/v1/3dtiles");
    expect(sw).toContain("if (isGoogleTile(url)) return;");
  });
});

describe("foliage lod", () => {
  it("keeps the near band and drops the far band", () => {
    expect(lodCount(40, 10)).toBe(40);
    expect(lodCount(40, 100)).toBe(20);
    expect(lodCount(40, 400)).toBeLessThanOrEqual(12);
    expect(lodCount(0, 10)).toBe(0);
  });
});
