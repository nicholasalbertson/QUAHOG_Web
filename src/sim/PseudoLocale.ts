/**
 * §15.1.8 Localization: pseudo-locale smoke.
 */

export function toPseudoLocale(s: string): string {
  // Expand + bracket to catch truncation / missing keys.
  const map: Record<string, string> = {
    a: "á",
    e: "é",
    i: "í",
    o: "ó",
    u: "ú",
    A: "Á",
    E: "É",
    I: "Í",
    O: "Ó",
    U: "Ú",
  };
  const out = [...s].map((c) => map[c] ?? c).join("");
  return `⟦${out}⟧`;
}

export function missingKeys(used: string[], catalog: Record<string, string>): string[] {
  return used.filter((k) => !(k in catalog));
}
