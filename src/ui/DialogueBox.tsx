import { useEffect, useState } from "react";
import { useGame } from "../store";
import { sfx } from "../audio/sfx";

export interface DialogueLine {
  speaker: string;
  text: string;
}

type Active = { lines: DialogueLine[]; onDone?: () => void } | null;

let active: Active = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

/** Imperative entry — starts a dialogue overlay (replaces any current). */
export function defineDialogue(lines: DialogueLine[], onDone?: () => void): () => void {
  return () => {
    active = { lines, onDone };
    notify();
  };
}

function clearDialogue() {
  active = null;
  notify();
}

/** Mount once in App — renders whatever defineDialogue() last started. */
export function ActiveDialogue() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  if (!active) return null;
  return (
    <DialogueBox
      lines={active.lines}
      onDone={() => {
        const done = active?.onDone;
        clearDialogue();
        done?.();
      }}
    />
  );
}

/** §8.3 — simple click-advance dialogue overlay. */
export function DialogueBox({
  lines,
  onDone,
}: {
  lines: DialogueLine[];
  onDone?: () => void;
}) {
  const [i, setI] = useState(0);
  const paused = useGame((s) => s.paused);
  useEffect(() => {
    setI(0);
  }, [lines]);

  if (!lines.length || paused) return null;
  const line = lines[Math.min(i, lines.length - 1)];

  const advance = () => {
    sfx.ui();
    if (i + 1 >= lines.length) {
      onDone?.();
      return;
    }
    setI(i + 1);
  };

  return (
    <div
      role="dialog"
      aria-label="Dialogue"
      onClick={advance}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 48,
        transform: "translateX(-50%)",
        zIndex: 75,
        width: "min(560px, 92vw)",
        background: "rgba(12,16,22,0.92)",
        border: "1px solid #3a4558",
        borderRadius: 8,
        padding: "16px 18px",
        color: "#f2f4f8",
        fontFamily: "system-ui, sans-serif",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: 1, color: "#d2b782", marginBottom: 6 }}>{line.speaker}</div>
      <div style={{ fontSize: 15, lineHeight: 1.45 }}>{line.text}</div>
      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.45 }}>
        Click to continue · {i + 1}/{lines.length}
      </div>
    </div>
  );
}

/** One-shot Bethel greeting for the opener mission. */
export const BETHEL_OPENER: DialogueLine[] = [
  { speaker: "Deacon Mealy", text: "You made it off the boat. Good. The Narrows don't wait." },
  { speaker: "Deacon Mealy", text: "Sully's people are leanin' on the docks. Start there — then we talk." },
];
