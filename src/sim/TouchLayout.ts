/**
 * §1.10.7 Layout editor: drag/resize, save to settings, reset to default.
 * §1.10.8 / §1.10.12 Persistence through save.
 */

export interface TouchWidgetLayout {
  id: string;
  x: number; // 0..1 normalized
  y: number;
  w: number;
  h: number;
}

export const DEFAULT_TOUCH_LAYOUT: TouchWidgetLayout[] = [
  { id: "move", x: 0.08, y: 0.72, w: 0.22, h: 0.22 },
  { id: "look", x: 0.7, y: 0.55, w: 0.25, h: 0.3 },
  { id: "action", x: 0.78, y: 0.78, w: 0.14, h: 0.12 },
  { id: "sprint", x: 0.62, y: 0.82, w: 0.12, h: 0.1 },
];

const KEY = "quahog.touchLayout.v1";

export function loadTouchLayout(storage: Storage = localStorage): TouchWidgetLayout[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return DEFAULT_TOUCH_LAYOUT.map((w) => ({ ...w }));
    const parsed = JSON.parse(raw) as TouchWidgetLayout[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TOUCH_LAYOUT.map((w) => ({ ...w }));
    return parsed.map((w) => ({ ...w }));
  } catch {
    return DEFAULT_TOUCH_LAYOUT.map((w) => ({ ...w }));
  }
}

export function saveTouchLayout(layout: TouchWidgetLayout[], storage: Storage = localStorage): void {
  storage.setItem(KEY, JSON.stringify(layout));
}

export function resetTouchLayout(storage: Storage = localStorage): TouchWidgetLayout[] {
  const next = DEFAULT_TOUCH_LAYOUT.map((w) => ({ ...w }));
  saveTouchLayout(next, storage);
  return next;
}

export function moveWidget(
  layout: TouchWidgetLayout[],
  id: string,
  x: number,
  y: number,
): TouchWidgetLayout[] {
  return layout.map((w) => (w.id === id ? { ...w, x: clamp01(x), y: clamp01(y) } : w));
}

export function resizeWidget(
  layout: TouchWidgetLayout[],
  id: string,
  w: number,
  h: number,
): TouchWidgetLayout[] {
  return layout.map((widget) =>
    widget.id === id
      ? { ...widget, w: clamp(w, 0.06, 0.4), h: clamp(h, 0.06, 0.4) }
      : widget,
  );
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

/** Safe-area CSS vars already applied in game.css — helper for JS consumers. */
export function safeAreaInsets(style: CSSStyleDeclaration | { getPropertyValue(p: string): string }): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const read = (p: string) => {
    const v = style.getPropertyValue(p);
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    top: read("--safe-top") || read("env(safe-area-inset-top)"),
    right: read("--safe-right") || read("env(safe-area-inset-right)"),
    bottom: read("--safe-bottom") || read("env(safe-area-inset-bottom)"),
    left: read("--safe-left") || read("env(safe-area-inset-left)"),
  };
}
