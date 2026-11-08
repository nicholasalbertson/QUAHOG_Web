/**
 * §8.2.2 Cutscene camera tracks + entity animation cues.
 */

export interface CamKey {
  t: number;
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
}

export interface AnimCue {
  t: number;
  entityId: string;
  clip: string;
}

export interface CutsceneTrack {
  id: string;
  duration: number;
  camera: CamKey[];
  cues: AnimCue[];
  skippable: boolean;
}

export interface CutscenePlayer {
  track: CutsceneTrack;
  t: number;
  skipped: boolean;
  done: boolean;
  firedCues: Set<string>;
}

export function startTrack(track: CutsceneTrack): CutscenePlayer {
  return { track, t: 0, skipped: false, done: false, firedCues: new Set() };
}

export function skipTrack(p: CutscenePlayer): void {
  if (!p.track.skippable) return;
  p.skipped = true;
  p.done = true;
  p.t = p.track.duration;
}

export function stepTrack(p: CutscenePlayer, dt: number): AnimCue[] {
  if (p.done) return [];
  const prev = p.t;
  p.t = Math.min(p.track.duration, p.t + dt);
  if (p.t >= p.track.duration) p.done = true;
  const fired: AnimCue[] = [];
  for (const c of p.track.cues) {
    const key = `${c.t}:${c.entityId}:${c.clip}`;
    if (c.t > prev && c.t <= p.t && !p.firedCues.has(key)) {
      p.firedCues.add(key);
      fired.push(c);
    }
  }
  return fired;
}

export function sampleCamera(p: CutscenePlayer): CamKey {
  const keys = p.track.camera;
  if (keys.length === 0) {
    return { t: p.t, x: 0, y: 2, z: 0, lookX: 0, lookY: 1, lookZ: 1 };
  }
  if (keys.length === 1) return keys[0]!;
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1]!.t < p.t) i++;
  const a = keys[i]!;
  const b = keys[Math.min(keys.length - 1, i + 1)]!;
  const span = Math.max(1e-6, b.t - a.t);
  const u = Math.max(0, Math.min(1, (p.t - a.t) / span));
  const lerp = (x: number, y: number) => x + (y - x) * u;
  return {
    t: p.t,
    x: lerp(a.x, b.x),
    y: lerp(a.y, b.y),
    z: lerp(a.z, b.z),
    lookX: lerp(a.lookX, b.lookX),
    lookY: lerp(a.lookY, b.lookY),
    lookZ: lerp(a.lookZ, b.lookZ),
  };
}
