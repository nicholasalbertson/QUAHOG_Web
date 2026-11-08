/**
 * §9.2 Spatial audio stub — WebAudio PannerNode wrapper.
 * Listener tracks the camera; one-shots can be placed in world space.
 */

export class SpatialAudio {
  private ctx: AudioContext | null = null;
  private listenerReady = false;
  /** §9.4 / §1.3.36 Master duck level 0..1. */
  private duck = 1;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.listenerReady = true;
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** §1.3.36 / §9.4 Duck music/SFX during cutscene/chase. */
  setDuck(level: number): void {
    this.duck = Math.max(0, Math.min(1, level));
  }

  getDuck(): number {
    return this.duck;
  }

  /** Update listener pose from camera (world metres). */
  setListener(x: number, y: number, z: number, forwardX: number, forwardZ: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.listenerReady) return;
    const l = ctx.listener;
    if (l.positionX) {
      l.positionX.value = x;
      l.positionY.value = y;
      l.positionZ.value = z;
      l.forwardX.value = forwardX;
      l.forwardY.value = 0;
      l.forwardZ.value = forwardZ;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      // Safari legacy
      const legacy = l as AudioListener & {
        setPosition?: (x: number, y: number, z: number) => void;
        setOrientation?: (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => void;
      };
      legacy.setPosition?.(x, y, z);
      legacy.setOrientation?.(forwardX, 0, forwardZ, 0, 1, 0);
    }
  }

  /**
   * Play a short noise burst at a world position (siren fly-by test / impacts).
   * Returns false if audio is unavailable.
   * §9.2.3 Occlusion stub: pass `occluded: true` to muffle (lowpass + quieter).
   */
  playAt(
    x: number,
    y: number,
    z: number,
    opts: { duration?: number; freq?: number; gain?: number; occluded?: boolean } = {},
  ): boolean {
    const ctx = this.ensure();
    if (!ctx) return false;
    const dur = opts.duration ?? 0.25;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 8;
    panner.maxDistance = 180;
    panner.rolloffFactor = 1.2;
    const occluded = !!opts.occluded;
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      (panner as PannerNode & { setPosition?: (x: number, y: number, z: number) => void }).setPosition?.(x, y, z);
    }
    osc.frequency.value = opts.freq ?? 440;
    gain.gain.value = (opts.gain ?? 0.15) * (occluded ? 0.35 : 1) * this.duck;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    if (occluded) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 480;
      gain.connect(lp);
      lp.connect(panner);
    } else {
      gain.connect(panner);
    }
    panner.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    return true;
  }
}

export const spatialAudio = new SpatialAudio();
