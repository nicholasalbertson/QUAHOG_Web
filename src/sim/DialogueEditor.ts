/**
 * §14.3 Line editor model with speaker/portrait/timing.
 */

export interface DialogueLineEdit {
  id: string;
  speaker: string;
  portrait?: string;
  text: string;
  startMs: number;
  durationMs: number;
}

export function subtitleWindows(lines: DialogueLineEdit[]): { id: string; from: number; to: number; text: string }[] {
  return lines.map((l) => ({
    id: l.id,
    from: l.startMs,
    to: l.startMs + l.durationMs,
    text: `${l.speaker}: ${l.text}`,
  }));
}

export function exportVoManifest(lines: DialogueLineEdit[]): { id: string; speaker: string; text: string }[] {
  return lines.map((l) => ({ id: l.id, speaker: l.speaker, text: l.text }));
}
