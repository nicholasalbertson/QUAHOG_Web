/**
 * §10.4 Accessibility — subtitles, colorblind, reduce-motion hooks.
 */

export interface A11ySettings {
  subtitles: boolean;
  subtitleSize: "sm" | "md" | "lg";
  colorblind: "none" | "protan" | "deutan" | "tritan";
  reduceMotion: boolean;
  screenFlash: boolean;
  uiScale: number;
}

const KEY = "mounthope.a11y.v1";

export const DEFAULT_A11Y: A11ySettings = {
  subtitles: true,
  subtitleSize: "md",
  colorblind: "none",
  reduceMotion: false,
  screenFlash: true,
  uiScale: 1,
};

let current: A11ySettings = { ...DEFAULT_A11Y };

export function getA11y(): A11ySettings {
  return { ...current };
}

export function setA11y(partial: Partial<A11ySettings>): A11ySettings {
  current = { ...current, ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch { /* ignore */ }
  return getA11y();
}

export function loadA11y(): A11ySettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return getA11y();
    const parsed = JSON.parse(raw) as Partial<A11ySettings>;
    current = { ...DEFAULT_A11Y, ...parsed };
  } catch { /* ignore */ }
  return getA11y();
}

/** Map a semantic color through colorblind filter (simple channel swap). */
export function a11yColor(hex: string, mode = current.colorblind): string {
  if (mode === "none") return hex;
  const n = parseInt(hex.replace("#", ""), 16);
  if (!Number.isFinite(n)) return hex;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (mode === "protan" || mode === "deutan") {
    const gray = Math.round(0.6 * r + 0.4 * g);
    r = gray; g = Math.round(g * 0.7 + b * 0.3);
  } else if (mode === "tritan") {
    const t = b; b = g; g = t;
  }
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
