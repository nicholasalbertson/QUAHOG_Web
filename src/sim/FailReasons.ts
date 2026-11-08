/**
 * §1.3.29 Canonical mission fail reasons.
 */

export const FAIL_REASONS = [
  "timeout",
  "actor_death",
  "vehicle_wreck",
  "out_of_bounds",
  "wanted",
  "scripted",
] as const;

export type FailReason = (typeof FAIL_REASONS)[number];

const ALIASES: Record<string, FailReason> = {
  "time's up": "timeout",
  timeout: "timeout",
  "actor death": "actor_death",
  actor_death: "actor_death",
  death: "actor_death",
  wreck: "vehicle_wreck",
  vehicle_wreck: "vehicle_wreck",
  "out of bounds": "out_of_bounds",
  out_of_bounds: "out_of_bounds",
  wanted: "wanted",
  busted: "wanted",
  scripted: "scripted",
};

export function normalizeFailReason(raw: string): FailReason {
  const key = raw.trim().toLowerCase();
  return ALIASES[key] ?? "scripted";
}

export function failReasonLabel(r: FailReason): string {
  switch (r) {
    case "timeout":
      return "Time's up";
    case "actor_death":
      return "Actor down";
    case "vehicle_wreck":
      return "Vehicle wrecked";
    case "out_of_bounds":
      return "Left the area";
    case "wanted":
      return "Wanted";
    case "scripted":
      return "Failed";
  }
}
