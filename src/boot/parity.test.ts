import { describe, expect, it } from "vitest";
import packs from "../content/licensedPacks.json";
import { BUILD_LINKS, clearBoot, peekBoot, stashBoot } from "../boot/intent";
import { nextStreetTier } from "../perf/frameTier";
import { coastTarget, reachedPin } from "../campaign/coastWorld";
import { castUrl } from "../actors/LicensedHuman";
import { vehicleUrl } from "../actors/Cc0Vehicle";

describe("both builds stay on the boot screen", () => {
  it("links the tiles page and the street page as peers", () => {
    expect(BUILD_LINKS.earth.href).toBe("./earth.html");
    expect(BUILD_LINKS.street.href).toBe("./index.html");
    expect(BUILD_LINKS.earth.label).not.toBe(BUILD_LINKS.street.label);
  });

  it("remembers which play button was pressed", () => {
    const memory = new Map<string, string>();
    const store = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    };
    const previous = globalThis.sessionStorage;
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: store });
    try {
      stashBoot("earth-continue");
      expect(peekBoot()).toBe("earth-continue");
      clearBoot();
      expect(peekBoot()).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: previous });
    }
  });
});

describe("licensed packs", () => {
  it("records a commercial-ok license, author, and source for every pack", () => {
    expect(packs.packs.length).toBeGreaterThanOrEqual(4);
    for (const pack of packs.packs) {
      expect(pack.author.length).toBeGreaterThan(0);
      expect(pack.commercial).toBe(true);
      expect(pack.license === "CC0-1.0" || pack.license.startsWith("CC-BY")).toBe(true);
      expect(pack.source).toMatch(/^https:\/\//);
      expect(pack.dest.length).toBeGreaterThan(0);
    }
    expect(castUrl(0)).toContain("quaternius-human.glb");
    expect(vehicleUrl(0)).toContain("sedan.glb");
    expect(vehicleUrl(3)).toContain("police.glb");
  });
});

describe("shared coast pins and frame ladder", () => {
  it("puts the Narrows west of the New Bedford origin", () => {
    const pin = coastTarget(41.7028, -71.1575);
    expect(pin.x).toBeLessThan(-1000);
    expect(reachedPin(pin.x, pin.z, pin, 10)).toBe(true);
    expect(reachedPin(pin.x + 40, pin.z, pin, 10)).toBe(false);
  });

  it("steps the street picture down only after a slow minute of frames", () => {
    expect(nextStreetTier(2, 0.05, 10)).toBe(2);
    expect(nextStreetTier(2, 0.05, 60)).toBe(1);
    expect(nextStreetTier(0, 0.05, 60)).toBe(0);
    expect(nextStreetTier(1, 0.016, 90)).toBe(1);
  });
});
