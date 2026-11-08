/**
 * §2.10.3 Fallback vehicle model on GLB failure.
 */

export interface FallbackVehicleDef {
  id: string;
  color: string;
  length: number;
  width: number;
  height: number;
}

export const FALLBACK_VEHICLE: FallbackVehicleDef = {
  id: "box-sedan",
  color: "#4a5560",
  length: 4.2,
  width: 1.8,
  height: 1.5,
};

export function resolveVehicleModel(packPath: string | null | undefined, failed = false): string | "fallback" {
  if (failed || !packPath) return "fallback";
  return packPath;
}
