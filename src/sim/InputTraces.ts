/**
 * §15.2.4 Scripted input traces (boot, drive, chase, mission, boat).
 */

export type TraceKind = "boot" | "drive" | "chase" | "mission" | "boat";

export interface InputFrame {
  t: number;
  axisX: number;
  axisY: number;
  taps: string[];
}

export const TRACES: Record<TraceKind, InputFrame[]> = {
  boot: [{ t: 0, axisX: 0, axisY: 0, taps: [] }],
  drive: [
    { t: 0, axisX: 0, axisY: 1, taps: [] },
    { t: 1, axisX: 0.2, axisY: 1, taps: [] },
    { t: 2, axisX: 0, axisY: 0, taps: ["Space"] },
  ],
  chase: [
    { t: 0, axisX: 0, axisY: 1, taps: [] },
    { t: 0.5, axisX: -0.4, axisY: 1, taps: [] },
  ],
  mission: [
    { t: 0, axisX: 0, axisY: 0.5, taps: [] },
    { t: 1, axisX: 0, axisY: 0, taps: ["KeyE"] },
  ],
  boat: [
    { t: 0, axisX: 0.1, axisY: 1, taps: [] },
    { t: 2, axisX: -0.1, axisY: 0.8, taps: [] },
  ],
};
