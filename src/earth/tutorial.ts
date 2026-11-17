// First-drive tutorial and the one-shot hints. Text only.

export interface TutorialFlags {
  moved: boolean;
  drove: boolean;
  mapped: boolean;
  dismissed: boolean;
}

export const TUTORIAL_STEPS: { id: string; text: string; done: (flags: TutorialFlags) => boolean }[] = [
  { id: "walk", text: "Walk with WASD. Shift runs.", done: (f) => f.moved },
  { id: "enter", text: "Walk up to the car and press E.", done: (f) => f.drove },
  { id: "drive", text: "Drive a short way. Space brakes. The right trigger works on a pad.", done: (f) => f.drove },
  { id: "map", text: "Press M for the map. Esc pauses. F1 lists the controls.", done: (f) => f.mapped },
];

export function tutorialStep(flags: TutorialFlags): { id: string; text: string } | null {
  if (flags.dismissed) return null;
  // Driving satisfies the walk and the enter step together once the car moves,
  // but the map step still has to happen.
  if (!flags.moved && !flags.drove) return TUTORIAL_STEPS[0];
  if (!flags.drove) return TUTORIAL_STEPS[1];
  if (!flags.mapped) return { id: "map", text: TUTORIAL_STEPS[3].text };
  return null;
}

export interface HintInput {
  damaged: boolean;
  heat: boolean;
  driving: boolean;
}

const HINTS: { id: string; text: string; when: (input: HintInput) => boolean }[] = [
  { id: "repair", text: "Hold R while stopped to pay for the repair.", when: (s) => s.damaged && s.driving },
  { id: "heat", text: "Stars fade if you stay clean. At three, a cruiser blocks the road.", when: (s) => s.heat },
  { id: "jobs", text: "Pause and open Story. Fall River is the first chapter.", when: (s) => s.driving },
];

export function nextHint(input: HintInput, seen: readonly string[]): { id: string; text: string } | null {
  for (const hint of HINTS) {
    if (seen.includes(hint.id)) continue;
    if (hint.when(input)) return { id: hint.id, text: hint.text };
  }
  return null;
}

export const CONTROLS_TEXT = [
  "WASD or the left stick — move",
  "E / A — enter or exit the car",
  "Space or the left trigger — brake",
  "Right trigger — accelerate",
  "Shift — run",
  "F / X — punch",
  "H — horn",
  "M — map",
  "Esc / Start — pause",
  "F1 — this list",
  "F3 — performance line",
  "T — next subtitle line",
];
