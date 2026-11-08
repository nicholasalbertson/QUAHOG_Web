/**
 * §9.5.3 VO-silent path still delivers all narrative text.
 */

export interface NarrativeLine {
  id: string;
  text: string;
  voKey?: string;
}

export function deliverNarrative(
  lines: NarrativeLine[],
  opts: { voEnabled: boolean; speak?: (key: string) => void; showText: (text: string) => void },
): { shown: string[]; spoken: string[] } {
  const shown: string[] = [];
  const spoken: string[] = [];
  for (const line of lines) {
    opts.showText(line.text);
    shown.push(line.id);
    if (opts.voEnabled && line.voKey) {
      opts.speak?.(line.voKey);
      spoken.push(line.id);
    }
  }
  return { shown, spoken };
}
