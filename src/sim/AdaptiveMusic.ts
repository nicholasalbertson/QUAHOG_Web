/**
 * §9.4 Adaptive music layers — explore / mission / chase / wanted.
 */

export type MusicLayer = "explore" | "mission" | "chase" | "wanted";

export interface MusicState {
  layer: MusicLayer;
  gain: number;
  target: MusicLayer;
  blend: number;
}

export function createMusicState(): MusicState {
  return { layer: "explore", gain: 1, target: "explore", blend: 1 };
}

export function pickLayer(opts: {
  cutscene?: boolean;
  missionActive?: boolean;
  stars?: number;
}): MusicLayer {
  if (opts.cutscene) return "mission";
  const stars = opts.stars ?? 0;
  if (stars >= 3) return "chase";
  if (stars >= 1) return "wanted";
  if (opts.missionActive) return "mission";
  return "explore";
}

/** Cross-fade toward target without clicks (linear blend). */
export function stepMusic(state: MusicState, target: MusicLayer, dt: number): MusicState {
  if (target !== state.target) {
    state.target = target;
    state.blend = 0;
  }
  state.blend = Math.min(1, state.blend + dt / 1.2);
  if (state.blend >= 1) state.layer = state.target;
  // Soft gain dip mid-crossfade to avoid clicks.
  state.gain = 0.7 + 0.3 * Math.abs(state.blend - 0.5) * 2;
  return state;
}
