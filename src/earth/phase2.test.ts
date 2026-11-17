import { describe, expect, it } from "vitest";
import { SLICE_ORIGIN, latLonToLocal, localToLatLon, sliceToFrame } from "./geo";
import { parseEarthLocal } from "./earthLocal";
import { OPENING_ARC, arcDistance, loadArc, currentArc, resetArc } from "./arc";
import { nearestCity } from "./regions";
import {
  lampPoints,
  CAR_ENTER_M,
  nearestRoadSpawn,
  parkedCar,
  planRebase,
  routesNear,
  shiftXZ,
  straightGuide,
} from "./rebase";

describe("frame rebase", () => {
  it("leaves a short hop on the current anchor", () => {
    expect(planRebase(SLICE_ORIGIN, 400, -200)).toBeNull();
  });

  it("moves the anchor under a long drive and shifts every body by the same delta", () => {
    const plan = planRebase(SLICE_ORIGIN, 2500, -300);
    expect(plan).not.toBeNull();
    const player = shiftXZ({ x: 2500, z: -300 }, plan!.shiftX, plan!.shiftZ);
    const ped = shiftXZ({ x: 2510, z: -295 }, plan!.shiftX, plan!.shiftZ);
    expect(Math.hypot(player.x, player.z)).toBeLessThan(1);
    expect(ped.x).toBeCloseTo(10, 4);
    expect(ped.z).toBeCloseTo(5, 4);
    const back = localToLatLon(plan!.anchor, player.x, player.z);
    const before = localToLatLon(SLICE_ORIGIN, 2500, -300);
    expect(back.lat).toBeCloseTo(before.lat, 6);
    expect(back.lon).toBeCloseTo(before.lon, 6);
  });

  it("keeps a 12 km drive inside the rebase radius", () => {
    let anchor = { ...SLICE_ORIGIN };
    let x = 0;
    let z = 0;
    for (let i = 0; i < 6; i++) {
      x += 2000;
      z += -500;
      const before = localToLatLon(anchor, x, z);
      const plan = planRebase(anchor, x, z, 1800);
      expect(plan).not.toBeNull();
      x -= plan!.shiftX;
      z -= plan!.shiftZ;
      anchor = plan!.anchor;
      const after = localToLatLon(anchor, x, z);
      expect(after.lat).toBeCloseTo(before.lat, 5);
      expect(after.lon).toBeCloseTo(before.lon, 5);
      expect(Math.hypot(x, z)).toBeLessThan(50);
    }
    const end = localToLatLon(anchor, x, z);
    const far = latLonToLocal(SLICE_ORIGIN, end);
    expect(Math.hypot(far.x, far.z)).toBeGreaterThan(10_000);
  });
});

describe("road spawn and local traffic routes", () => {
  const roads = [
    { highway: "residential", points: [[120, 0], [120, 80]] as [number, number][] },
    { highway: "footway", points: [[0, 0], [0, 10]] as [number, number][] },
    { highway: "primary", points: [[9000, 0], [9100, 0]] as [number, number][] },
  ];

  it("snaps to the nearest drivable centerline and ignores footways", () => {
    const hit = nearestRoadSpawn(roads, SLICE_ORIGIN, true);
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(120, 3);
    expect(hit!.z).toBeCloseTo(0, 3);
  });

  it("parks the car ahead on the heading, inside the enter radius", () => {
    const spawn = { x: 10, z: 4, heading: 0.4 };
    const car = parkedCar(spawn);
    const dist = Math.hypot(car.x - spawn.x, car.z - spawn.z);
    expect(dist).toBeGreaterThan(2);
    expect(dist).toBeLessThan(CAR_ENTER_M);
    const step = 1.2;
    const walked = Math.hypot(car.x - (spawn.x + Math.sin(spawn.heading) * step), car.z - (spawn.z + Math.cos(spawn.heading) * step));
    expect(walked).toBeLessThan(dist);
  });

  it("skips a far road's points when the bounds are outside the search", () => {
    const far = {
      highway: "residential" as const,
      points: Array.from({ length: 20000 }, (_, i) => [9000 + i * 0.01, 9000] as [number, number]),
    };
    const near = { highway: "primary" as const, points: [[12, 0], [12, 30]] as [number, number][] };
    const started = performance.now();
    const hit = nearestRoadSpawn([far, near], SLICE_ORIGIN, false);
    expect(performance.now() - started).toBeLessThan(80);
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(12, 0);
  });

  it("builds routes near the anchor and skips ones already in the set", () => {
    const near = routesNear(roads, SLICE_ORIGIN, new Set());
    expect(near.map((r) => r.roadIndex)).toEqual([0]);
    expect(routesNear(roads, SLICE_ORIGIN, new Set([0]))).toEqual([]);
  });
});

describe("guidance and lamps", () => {
  it("points north when the target is north and the car faces south", () => {
    const g = straightGuide(0, 0, 0, 0, -100);
    expect(g.distanceRemaining).toBeCloseTo(100, 4);
    expect(Math.abs(g.bearing)).toBeGreaterThan(2);
    expect(g.wrongWay).toBe(true);
  });

  it("converts a slice mission target through a moved anchor", () => {
    const home = sliceToFrame(SLICE_ORIGIN, -272.23, -106.5, false);
    expect(home.x).toBeCloseTo(-272.23, 1);
    expect(home.z).toBeCloseTo(106.5, 1);
    const moved = localToLatLon(SLICE_ORIGIN, 2000, 0);
    const away = sliceToFrame(moved, -272.23, -106.5, false);
    expect(away.x).toBeLessThan(-2000);
  });

  it("places lamps on a nearby road and none on a distant one", () => {
    const roads = [
      { highway: "residential", points: [[0, 0], [0, 40], [0, 90]] as [number, number][] },
      { highway: "residential", points: [[8000, 0], [8000, 100]] as [number, number][] },
    ];
    const lamps = lampPoints(roads, SLICE_ORIGIN, 0, 0, 4);
    expect(lamps.length).toBeGreaterThan(0);
    for (const lamp of lamps) expect(Math.hypot(lamp.x, lamp.z)).toBeLessThan(200);
  });
});

describe("opening arc and resume anchor", () => {
  it("measures the Narrows step from the Fall River pin", () => {
    resetArc();
    loadArc(0);
    const step = currentArc()!;
    expect(step.id).toBe("narrows");
    const anchor = { lat: 41.7028, lon: -71.1575 };
    expect(arcDistance(anchor, 0, 0, step)).toBeLessThan(5);
    expect(OPENING_ARC.some((s) => s.needCar)).toBe(true);
  });

  it("keeps a highway anchor and rejects one off the coast", () => {
    expect(parseEarthLocal({
      placeId: "the-narrows", x: 12, z: -4, heading: 0.2, lat: 41.69, lon: -71.1, arcStep: 2,
    })).toMatchObject({ lat: 41.69, lon: -71.1, arcStep: 2 });
    expect(parseEarthLocal({ placeId: "the-narrows", x: 0, z: 0, lat: 10, lon: -71 })).toBeNull();
    expect(parseEarthLocal({ placeId: "nb-bethel", x: 1, z: 2 })).toMatchObject({ placeId: "nb-bethel" });
  });

  it("names Fall River when standing at the Narrows", () => {
    expect(nearestCity(41.7028, -71.1575).region).toBe("fallRiver");
    expect(nearestCity(42.083, -71.02).region).toBe("brockton");
  });
});
