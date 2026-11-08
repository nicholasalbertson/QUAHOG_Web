import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import type { Road } from "../slice";
import { computeTrafficLightPositions } from "./TrafficLights";

/**
 * Publishes red/amber stop-lines without decorative mast-arm meshes.
 * Used when DRESSING_ENABLED is false so traffic still respects signals (#26).
 */
export function TrafficStopZones({ roads, center }: { roads: Road[]; center: [number, number] }) {
  const spots = useMemo(() => computeTrafficLightPositions(roads, center), [roads, center]);

  useEffect(() => {
    shared.stopZones = spots.map((s) => ({ x: s.x, z: s.z, rot: s.rot, red: false }));
    return () => { shared.stopZones = []; };
  }, [spots]);

  useFrame(({ clock }) => {
    spots.forEach((s, i) => {
      const p = (clock.elapsedTime + s.phase) % 7.8; // 4s red, 3s green, 0.8 amber
      const red = p < 4;
      const amber = p >= 7;
      const z = shared.stopZones[i];
      if (z) z.red = red || amber;
    });
  });

  return null;
}
