// Build 002: shared render-stats snapshot, written by <PerfProbe/> inside the
// Canvas once per ~500ms and read by <DebugStats/> outside it. Purely local
// telemetry for the "measured, not assumed" performance gate.
export const perfStats = {
  draws: 0,
  tris: 0,
  fps: 0,
  p95Ms: 0,
  samples: 0,
  // Resident GPU resources (2026-11-07, density measurement): gl.info.memory
  // counts live geometries + textures — the numbers that decide whether the
  // dressing/tile/tier1 resident set is what pressures the iPhone into a
  // context loss / jetsam reload. Read by PerfProbe, shown in the overlay,
  // shipped on the 1 Hz beacon.
  geometries: 0,
  textures: 0,
};
