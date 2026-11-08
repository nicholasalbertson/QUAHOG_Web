/**
 * §14.8 Sandbox map + dummy missions + perf stress config.
 */

import { defineMission } from "./MissionAuthoring";

export const SANDBOX_FEATURES = [
  "foot",
  "car",
  "boat",
  "wanted",
  "mission",
  "economy",
  "race",
  "swim",
] as const;

export function dummyMissions() {
  const kinds = ["goto", "talk", "destroy", "photo", "deliver", "timed"];
  return kinds.map((k, i) =>
    defineMission({
      id: `sandbox-${k}`,
      title: `Sandbox ${k}`,
      steps: [{ id: `s0`, objective: `${k} objective ${i}` }],
    }),
  );
}

export const STRESS_SCENE = {
  peds: 200,
  traffic: 80,
  boats: 12,
  props: 400,
};
