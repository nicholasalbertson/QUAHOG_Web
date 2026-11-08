/**
 * §15.2.2–3 Bad manifests / mission defs (one per known rule).
 */

export const BAD_MANIFEST_FIXTURES: { rule: string; raw: unknown }[] = [
  { rule: "root-type", raw: null },
  { rule: "missing-version", raw: { name: "x", zones: [], roads: [], markers: [] } },
  { rule: "duplicate-id", raw: { version: 1, name: "x", zones: [], roads: [], landmarks: [], markers: [{ id: "a", kind: "p", x: 0, z: 0 }, { id: "a", kind: "p", x: 1, z: 1 }], spawns: [], doors: [], signals: [], raceTracks: [], collectibles: [], fronts: [], territories: [] } },
  { rule: "outside-zone", raw: { version: 1, name: "x", zones: [{ id: "c", name: "c", bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 } }], roads: [], landmarks: [], markers: [{ id: "far", kind: "p", x: 999, z: 999 }], spawns: [], doors: [], signals: [], raceTracks: [], collectibles: [], fronts: [], territories: [] } },
  { rule: "front-cost", raw: { version: 1, name: "x", zones: [], roads: [], landmarks: [], markers: [], spawns: [], doors: [], signals: [], raceTracks: [], collectibles: [], fronts: [{ id: "f", name: "F", x: 0, z: 0, cost: -1 }], territories: [] } },
];

export const BAD_MISSION_FIXTURES: { rule: string; raw: unknown }[] = [
  { rule: "not-object", raw: 3 },
  { rule: "missing-id", raw: { title: "T", steps: [{ id: "s", objective: "o" }] } },
  { rule: "empty-steps", raw: { id: "m", title: "T", steps: [] } },
  { rule: "bad-condition", raw: { id: "m", title: "T", steps: [{ id: "s", objective: "o", condition: { op: "leaf", id: "nope.here" } }] } },
];
