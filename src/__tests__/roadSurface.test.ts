import { describe, expect, it } from "vitest";
import { classifyRoadSurface } from "../world/roadSurface";
import type { Road } from "../slice";

function road(partial: Partial<Road> & Pick<Road, "highway">): Road {
  return {
    width: 7,
    name: null,
    points: [[0, 0], [10, 0]],
    ...partial,
  };
}

describe("classifyRoadSurface — real-world cobble only", () => {
  it("uses OSM sett/cobblestone surface tags", () => {
    expect(classifyRoadSurface(road({ highway: "residential", surface: "sett" }))).toBe("cobble");
    expect(classifyRoadSurface(road({ highway: "residential", surface: "cobblestone" }))).toBe("cobble");
  });

  it("does not invent cobble from common downtown street names", () => {
    expect(classifyRoadSurface(road({ highway: "residential", name: "Union Street" }))).toBe("asphalt");
    expect(classifyRoadSurface(road({ highway: "residential", name: "Water Street" }))).toBe("asphalt");
    expect(classifyRoadSurface(road({ highway: "residential", name: "William Street" }))).toBe("asphalt");
  });

  it("allows verified Johnny Cake Hill setts", () => {
    expect(classifyRoadSurface(road({ highway: "residential", name: "Johnny Cake Hill" }))).toBe("cobble");
  });

  it("maps footways without cobble surface to sidewalk, not setts", () => {
    expect(classifyRoadSurface(road({ highway: "footway" }))).toBe("sidewalk");
    expect(classifyRoadSurface(road({ highway: "pedestrian" }))).toBe("sidewalk");
  });

  it("maps tracks and unpaved to asphalt (no dirt ribbons)", () => {
    expect(classifyRoadSurface(road({ highway: "track" }))).toBe("asphalt");
    expect(classifyRoadSurface(road({ highway: "service", surface: "gravel" }))).toBe("asphalt");
  });
});
