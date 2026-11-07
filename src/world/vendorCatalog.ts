/**
 * Curated CC0 vendor + pack011 paths that fill street / park / harbor gaps.
 * Full packs live under public/vendor/; only these templates mount at runtime.
 */

export const PACK011 = {
  lamp: "/packs/pack011/historic_pedestrian_lamp.glb",
  cobra: "/packs/pack011/streetlight_cobrahead.glb",
  hydrant: "/packs/pack011/fire_hydrant.glb",
  mailbox: "/packs/pack011/postal_letterbox.glb",
  bench: "/packs/pack011/bench_metal_wood.glb",
  trash: "/packs/pack011/trash_receptacle.glb",
  bollard: "/packs/pack011/sidewalk_bollard_low.glb",
  stop: "/packs/pack011/stop_sign.glb",
  yield: "/packs/pack011/yield_sign.glb",
  maple: "/packs/pack011/sugar_maple.glb",
  oak: "/packs/pack011/red_oak.glb",
  pine: "/packs/pack011/coastal_pine.glb",
  spruce: "/packs/pack011/spruce.glb",
  hedge: "/packs/pack011/boxwood_hedge.glb",
  bikeRack: "/packs/pack011/bike_rack.glb",
  busShelter: "/packs/pack011/bus_shelter.glb",
} as const;

const KENNEY_GLB = "/vendor/kenney";
const KENNEY_GLTF = "/vendor/kenney";

export const KENNEY = {
  // Nature Kit ships under Models/GLTF format/*.glb
  treeDefault: `${KENNEY_GLTF}/nature-kit/Models/GLTF format/tree_default.glb`,
  treeOak: `${KENNEY_GLTF}/nature-kit/Models/GLTF format/tree_oak.glb`,
  treeDetailed: `${KENNEY_GLTF}/nature-kit/Models/GLTF format/tree_detailed.glb`,
  treePine: `${KENNEY_GLTF}/nature-kit/Models/GLTF format/tree_pineTallA.glb`,
  bush: `${KENNEY_GLTF}/nature-kit/Models/GLTF format/plant_bushLarge.glb`,
  rock: `${KENNEY_GLTF}/nature-kit/Models/GLTF format/stone_tallA.glb`,
  // City / roads
  trafficLight: `${KENNEY_GLB}/city-kit-roads/Models/GLB format/traffic-light.glb`,
  cone: `${KENNEY_GLB}/city-kit-roads/Models/GLB format/construction-cone.glb`,
  roadSign: `${KENNEY_GLB}/city-kit-roads/Models/GLB format/road-sign-warning.glb`,
  lightSquare: `${KENNEY_GLB}/city-kit-roads/Models/GLB format/light-square.glb`,
  // Suburban props
  fence: `${KENNEY_GLB}/city-kit-suburban/Models/GLB format/fence.glb`,
  planter: `${KENNEY_GLB}/city-kit-suburban/Models/GLB format/planter.glb`,
  treeSmall: `${KENNEY_GLB}/city-kit-suburban/Models/GLB format/tree-small.glb`,
  // Industrial / waterfront
  container: `${KENNEY_GLB}/city-kit-industrial/Models/GLB format/shipping-container-a.glb`,
  tank: `${KENNEY_GLB}/city-kit-industrial/Models/GLB format/detail-tank.glb`,
  // Cars (extra variety for parked accents — not traffic AI)
  sedan: `${KENNEY_GLB}/car-kit/Models/GLB format/sedan.glb`,
  suv: `${KENNEY_GLB}/car-kit/Models/GLB format/suv.glb`,
  hatchback: `${KENNEY_GLB}/car-kit/Models/GLB format/hatchback-sports.glb`,
  // Watercraft
  boat: `${KENNEY_GLB}/watercraft-kit/Models/GLB format/boat-fishing-small.glb`,
  sail: `${KENNEY_GLB}/watercraft-kit/Models/GLB format/boat-sail-a.glb`,
  buoy: `${KENNEY_GLB}/watercraft-kit/Models/GLB format/buoy.glb`,
  // Furniture benches for parks
  bench: `${KENNEY_GLB}/furniture-kit/Models/GLTF format/bench.glb`,
  trashcan: `${KENNEY_GLB}/furniture-kit/Models/GLTF format/trashcan.glb`,
} as const;

/** Poly Haven maps used to upgrade procedural road/facade materials. */
export const POLYHAVEN = {
  asphaltDiff: "/vendor/polyhaven/asphalt_02/asphalt_02_Diffuse.jpg",
  asphaltNor: "/vendor/polyhaven/asphalt_02/asphalt_02_nor_gl.jpg",
  asphaltRough: "/vendor/polyhaven/asphalt_02/asphalt_02_Rough.jpg",
  cobbleDiff: "/vendor/polyhaven/cobblestone_01/cobblestone_01_Diffuse.jpg",
  cobbleNor: "/vendor/polyhaven/cobblestone_01/cobblestone_01_nor_gl.jpg",
  cobbleArm: "/vendor/polyhaven/cobblestone_01/cobblestone_01_arm.jpg",
  brickDiff: "/vendor/polyhaven/brick_pavement/brick_pavement_Diffuse.jpg",
  plankDiff: "/vendor/polyhaven/brown_planks_08/brown_planks_08_Diffuse.jpg",
  roofDiff: "/vendor/polyhaven/clay_roof_tiles/clay_roof_tiles_Diffuse.jpg",
  sandDiff: "/vendor/polyhaven/coast_sand_01/coast_sand_01_Diffuse.jpg",
} as const;

/** Cycle of street trees for GlbStreetDressing. */
export const STREET_TREE_POOL = [
  PACK011.maple,
  PACK011.oak,
  PACK011.pine,
  PACK011.spruce,
  KENNEY.treeDefault,
  KENNEY.treeDetailed,
  KENNEY.treeOak,
  KENNEY.treeSmall,
] as const;

export const STREET_LAMP_POOL = [PACK011.lamp, PACK011.cobra, KENNEY.lightSquare] as const;
