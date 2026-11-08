/**
 * §16.3–16.5 Pluralization / number format / RTL helpers.
 */

export function plural(n: number, one: string, other: string): string {
  return Math.abs(n) === 1 ? one : other;
}

export function formatNumber(n: number, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}

export function isRtl(locale: string): boolean {
  return /^(ar|he|fa|ur)\b/i.test(locale);
}

export function mirrorDir(locale: string): "ltr" | "rtl" {
  return isRtl(locale) ? "rtl" : "ltr";
}

export const FONT_FALLBACK =
  'system-ui, "Noto Sans", "Noto Sans CJK", "Noto Sans Arabic", sans-serif';
