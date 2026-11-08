/**
 * §16.6 Subtitle timing externalized with dialogue lines.
 */

export interface TimedSubtitle {
  key: string;
  startMs: number;
  endMs: number;
}

export function subtitlesAt(lines: TimedSubtitle[], tMs: number): TimedSubtitle[] {
  return lines.filter((l) => tMs >= l.startMs && tMs < l.endMs);
}
