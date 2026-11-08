/**
 * §8.2 Dialogue / cutscene narrative stub.
 */

export interface DialogueLine {
  speaker: string;
  text: string;
  portrait?: string;
}

export interface DialogueSession {
  id: string;
  lines: DialogueLine[];
  cursor: number;
  log: DialogueLine[];
  skipped: boolean;
  done: boolean;
}

export function startDialogue(id: string, lines: DialogueLine[]): DialogueSession {
  return { id, lines, cursor: 0, log: [], skipped: false, done: lines.length === 0 };
}

export function advanceDialogue(s: DialogueSession): DialogueLine | null {
  if (s.done || s.skipped) return null;
  if (s.cursor >= s.lines.length) {
    s.done = true;
    return null;
  }
  const line = s.lines[s.cursor++];
  s.log.push(line);
  if (s.cursor >= s.lines.length) s.done = true;
  return line;
}

export function skipDialogue(s: DialogueSession): void {
  while (!s.done) advanceDialogue(s);
  s.skipped = true;
}

/** §8.2.3 / §10.4 Subtitle hook. */
export type SubtitleSink = (text: string, speaker?: string) => void;

let subtitleSink: SubtitleSink = () => undefined;

export function setSubtitleSink(fn: SubtitleSink): void {
  subtitleSink = fn;
}

export function emitSubtitle(text: string, speaker?: string): void {
  subtitleSink(text, speaker);
}

/** §9.5 Web Speech VO hook with silent fallback. */
export function speakLine(text: string): { spoken: boolean; text: string } {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    emitSubtitle(text);
    return { spoken: false, text };
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
    emitSubtitle(text);
    return { spoken: true, text };
  } catch {
    emitSubtitle(text);
    return { spoken: false, text };
  }
}
