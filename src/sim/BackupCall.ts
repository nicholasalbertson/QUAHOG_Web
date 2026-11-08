/**
 * §3.5.2 Backup call event — audio + HUD payload.
 */

import { emitTelemetry } from "../telemetry/schema";

export interface BackupCall {
  at: number;
  stars: number;
  message: string;
}

export function emitBackupCall(stars: number, at = 0): BackupCall {
  const call: BackupCall = {
    at,
    stars,
    message: stars >= 4 ? "Air support inbound" : "Units responding",
  };
  emitTelemetry("sim.heat.backup", { stars, message: call.message });
  return call;
}
