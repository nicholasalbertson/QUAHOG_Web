/**
 * §1.10.9 Haptics hooks — no-op where unsupported.
 */

export type HapticKind = "light" | "medium" | "heavy" | "success" | "error";

export function haptic(kind: HapticKind = "light"): boolean {
  if (typeof navigator === "undefined") return false;
  const vib = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
  if (typeof vib !== "function") return false;
  const pattern: Record<HapticKind, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    success: [10, 30, 10],
    error: [30, 20, 30],
  };
  try {
    return !!vib.call(navigator, pattern[kind]);
  } catch {
    return false;
  }
}
