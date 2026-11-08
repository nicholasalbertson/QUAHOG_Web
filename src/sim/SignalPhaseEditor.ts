/**
 * §14.1.4 Signal phase editor with preview.
 */

import { createSignal, stepSignal, type SignalState } from "./SignalFsm";

export interface PhasePreview {
  t: number;
  phase: string;
}

export function previewSignalPhases(durationSec: number, dt = 0.5): PhasePreview[] {
  const s: SignalState = createSignal("edit");
  const out: PhasePreview[] = [];
  for (let t = 0; t <= durationSec; t += dt) {
    stepSignal(s, dt);
    out.push({ t, phase: s.phase });
  }
  return out;
}
