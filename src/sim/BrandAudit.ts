/**
 * §10.8.2 Zero conflicting brand strings in shipped UI.
 */

export const CANONICAL_BRAND = "The Narrows";

const FORBIDDEN = ["QUAHOG", "Quahog", "GTA", "Grand Theft"];

export function brandConflicts(texts: string[]): string[] {
  const hits: string[] = [];
  for (const t of texts) {
    for (const bad of FORBIDDEN) {
      if (t.includes(bad) && !t.includes(CANONICAL_BRAND)) hits.push(t);
    }
  }
  return [...new Set(hits)];
}
