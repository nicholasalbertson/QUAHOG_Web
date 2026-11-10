import { describe, expect, it } from "vitest";
import { headingForBearing, latLonToLocal, localToLatLon, sliceToLatLon, SLICE_ORIGIN } from "./geo";
import { chaseForSpeed, stepEarthDrive } from "./drive";
import { parseEarthLocal, sharesStylizedFrame } from "./earthLocal";
import { HIGHWAYS, PLACES, placeById, placesInRegion, roadsSliceFor } from "./regions";
import { describeLocation, frameSouthCoast, placeAtScreen, project, unproject, zoomView } from "./regionMap";

describe("south coast geography", () => {
  it("round-trips a local offset through lat/lon", () => {
    const anchor = SLICE_ORIGIN;
    const back = latLonToLocal(anchor, localToLatLon(anchor, 250, -480));
    expect(back.x).toBeCloseTo(250, 3);
    expect(back.z).toBeCloseTo(-480, 3);
  });

  it("maps north to latitude and east to longitude", () => {
    const moved = localToLatLon(SLICE_ORIGIN, 1000, -1000);
    expect(moved.lat).toBeGreaterThan(SLICE_ORIGIN.lat);
    expect(moved.lon).toBeGreaterThan(SLICE_ORIGIN.lon);
    expect(headingForBearing(0)).toBeCloseTo(Math.PI, 5);
    expect(headingForBearing(90)).toBeCloseTo(Math.PI / 2, 5);
  });

  it("keeps the original photoreal drop points", () => {
    expect(placeById("nb-bethel")).toMatchObject({ lat: 41.636, lon: -70.9205, sliceAligned: true });
    expect(placeById("battleship-cove")).toMatchObject({ lat: 41.7044, lon: -71.1641 });
    expect(placeById("lizzie-borden")).toMatchObject({ lat: 41.6993, lon: -71.1558 });
    expect(placeById("fr-downtown")).toMatchObject({ lat: 41.7015, lon: -71.1547 });
  });

  it("covers the South Coast cities, the Narrows, and the connecting highways", () => {
    expect(placesInRegion("fallRiver").some((p) => p.id === "the-narrows")).toBe(true);
    expect(placesInRegion("newBedford").length).toBeGreaterThan(3);
    expect(placesInRegion("brockton").some((p) => p.id === "brockton-downtown")).toBe(true);
    expect(placesInRegion("cape").some((p) => /hyannis/i.test(p.name))).toBe(true);
    expect(placesInRegion("southCoast").some((p) => p.id === "wareham")).toBe(true);
    expect(HIGHWAYS.map((h) => h.name)).toEqual(expect.arrayContaining([
      "I-195", "Route 24", "US 6", "Route 25", "Route 28",
    ]));
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    expect(roadsSliceFor(placeById("brockton-downtown")!)).toBe("slice-brockton.json");
    expect(roadsSliceFor(placeById("fairhaven")!)).toBe("slice-newbedford.json");
    expect(roadsSliceFor(placeById("taunton-green")!)).toBeNull();
  });

  it("puts Battleship Cove on the slice frame used by the stylized world", () => {
    const ll = sliceToLatLon(-20273, 7625);
    expect(ll.lat).toBeCloseTo(41.7044, 2);
    expect(ll.lon).toBeCloseTo(-71.1641, 2);
  });
});

describe("region chart", () => {
  it("frames every place inside the padded map", () => {
    const view = frameSouthCoast(1200, 800, 40);
    for (const place of PLACES) {
      const p = project(view, place.lat, place.lon, 1200, 800);
      expect(p.x).toBeGreaterThan(20);
      expect(p.x).toBeLessThan(1180);
      expect(p.y).toBeGreaterThan(20);
      expect(p.y).toBeLessThan(780);
    }
  });

  it("hits the place under the cursor and keeps that point while zooming", () => {
    const view = frameSouthCoast(800, 600);
    const narrows = placeById("the-narrows")!;
    const at = project(view, narrows.lat, narrows.lon, 800, 600);
    expect(placeAtScreen(view, 800, 600, at.x, at.y)?.id).toBe("the-narrows");
    const zoomed = zoomView(view, 3, { x: at.x, y: at.y, width: 800, height: 600 });
    const again = unproject(zoomed, at.x, at.y, 800, 600);
    expect(again.lat).toBeCloseTo(narrows.lat, 4);
    expect(again.lon).toBeCloseTo(narrows.lon, 4);
  });

  it("names the place you're standing on, and the highway when you're on it", () => {
    const narrows = placeById("the-narrows")!;
    expect(describeLocation(narrows, 0, 0).title).toBe("The Narrows");
    const highway = { lat: 41.9, lon: -70.02 };
    const local = latLonToLocal(highway, highway);
    expect(describeLocation(highway, local.x, local.z).title).toBe("US 6");
  });

  it("prefers a named street underfoot", () => {
    const anchor = SLICE_ORIGIN;
    const roads = [{
      name: "Johnny Cake Hill",
      highway: "residential",
      points: [[0, 0], [0, 40]] as [number, number][],
    }];
    expect(describeLocation(anchor, 2, -10, roads, true)).toMatchObject({
      title: "Johnny Cake Hill",
    });
  });
});

describe("earth driving", () => {
  const still = { yaw: 0, speed: 0, skidding: false };
  const dry = { handbrake: false, wet: false };

  it("builds speed, rolls when you lift off, and stops faster under brake", () => {
    let rolling = still;
    for (let i = 0; i < 120; i++) rolling = stepEarthDrive(rolling, { x: 0, y: 1 }, 1 / 60, dry);
    expect(rolling.speed).toBeGreaterThan(15);

    let coast = { ...rolling };
    let brake = { ...rolling };
    for (let i = 0; i < 50; i++) {
      coast = stepEarthDrive(coast, { x: 0, y: 0 }, 1 / 60, dry);
      brake = stepEarthDrive(brake, { x: 0, y: -1 }, 1 / 60, dry);
    }
    expect(brake.speed).toBeLessThan(coast.speed * 0.5);
    expect(coast.speed).toBeGreaterThan(5);
  });

  it("steers more at neighborhood speed than at highway speed", () => {
    const low = stepEarthDrive({ yaw: 0, speed: 6, skidding: false }, { x: 1, y: 1 }, 0.05, dry);
    const high = stepEarthDrive({ yaw: 0, speed: 28, skidding: false }, { x: 1, y: 1 }, 0.05, dry);
    expect(Math.abs(low.yaw)).toBeGreaterThan(Math.abs(high.yaw));
  });

  it("is slower to launch on wet pavement and scrubs speed on the handbrake", () => {
    let dryCar = still;
    let wetCar = still;
    for (let i = 0; i < 90; i++) {
      dryCar = stepEarthDrive(dryCar, { x: 0, y: 1 }, 1 / 60, dry);
      wetCar = stepEarthDrive(wetCar, { x: 0, y: 1 }, 1 / 60, { handbrake: false, wet: true });
    }
    expect(wetCar.speed).toBeLessThan(dryCar.speed);
    const held = stepEarthDrive({ yaw: 0, speed: 24, skidding: false }, { x: 0, y: 0 }, 0.4, { handbrake: true, wet: false });
    expect(held.speed).toBeLessThan(12);
    expect(chaseForSpeed(30).dist).toBeGreaterThan(chaseForSpeed(0).dist);
  });

  it("reverses only once the car has actually stopped", () => {
    let car = { yaw: 0, speed: 8, skidding: false };
    car = stepEarthDrive(car, { x: 0, y: -1 }, 1 / 60, dry);
    expect(car.speed).toBeGreaterThan(0);
    for (let i = 0; i < 180; i++) car = stepEarthDrive(car, { x: 0, y: -1 }, 1 / 60, dry);
    expect(car.speed).toBeLessThan(0);
  });
});

describe("earth resume blob", () => {
  it("accepts a known place and rejects a pose that would fling the player", () => {
    expect(parseEarthLocal({ placeId: "battleship-cove", x: 12, z: -4, heading: 1 })).toMatchObject({
      placeId: "battleship-cove", x: 12,
    });
    expect(parseEarthLocal({ placeId: "nope", x: 0, z: 0 })).toBeNull();
    expect(parseEarthLocal({ placeId: "wareham", x: 9000, z: 0 })).toBeNull();
    expect(parseEarthLocal({ placeId: "nb-bethel", x: Number.NaN, z: 0 })).toBeNull();
    expect(sharesStylizedFrame("nb-bethel")).toBe(true);
    expect(sharesStylizedFrame("brockton-downtown")).toBe(false);
  });
});
