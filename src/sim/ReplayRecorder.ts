/**
 * §0.3 / §1.1.12 Replay recorder — input log + seed for deterministic re-run.
 * Records compact per-step deltas; playback drives GameLoop without wall clock.
 */

import { rng } from "./Rng";

export interface ReplayFrame {
  step: number;
  /** Packed axis + buttons (optional; render actors may ignore). */
  steer: number;
  throttle: number;
  bits: number;
}

export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private recording = false;
  private playing = false;
  private playCursor = 0;
  private seed = 0;
  private step = 0;

  startRecord(seed = 0x4d4f554e): void {
    this.seed = seed >>> 0;
    rng.reseed(this.seed);
    this.frames = [];
    this.step = 0;
    this.recording = true;
    this.playing = false;
    this.playCursor = 0;
  }

  stopRecord(): ReplayFrame[] {
    this.recording = false;
    return this.frames.slice();
  }

  recordStep(input: { steer: number; throttle: number; bits?: number }): void {
    if (!this.recording) return;
    this.frames.push({
      step: this.step++,
      steer: input.steer,
      throttle: input.throttle,
      bits: input.bits ?? 0,
    });
  }

  load(frames: ReplayFrame[], seed: number): void {
    this.frames = frames.slice();
    this.seed = seed >>> 0;
    this.playing = true;
    this.recording = false;
    this.playCursor = 0;
    this.step = 0;
    rng.reseed(this.seed);
  }

  /** Next recorded frame, or null when exhausted. */
  nextPlayFrame(): ReplayFrame | null {
    if (!this.playing || this.playCursor >= this.frames.length) return null;
    return this.frames[this.playCursor++];
  }

  get isRecording(): boolean {
    return this.recording;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get frameCount(): number {
    return this.frames.length;
  }

  digest(): string {
    let h = this.seed >>> 0;
    for (const f of this.frames) {
      h = Math.imul(h ^ (f.step + 1), 16777619);
      h = Math.imul(h ^ (Math.round(f.steer * 1000) + 17), 16777619);
      h = Math.imul(h ^ (Math.round(f.throttle * 1000) + 31), 16777619);
      h ^= f.bits;
    }
    return `replay:${(h >>> 0).toString(16)}:${this.frames.length}`;
  }
}

export const replayRecorder = new ReplayRecorder();
