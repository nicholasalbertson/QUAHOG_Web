/**
 * §2.7.1 ≥ 3 distinct models + palette variation.
 */

export const PED_PALETTES = [
  { id: "dock", primary: "#3a4a5a", secondary: "#c4a574" },
  { id: "tour", primary: "#2f5d4a", secondary: "#d0c8b0" },
  { id: "night", primary: "#1e2430", secondary: "#8a90a0" },
] as const;

export function paletteForIndex(i: number): (typeof PED_PALETTES)[number] {
  return PED_PALETTES[i % PED_PALETTES.length]!;
}

/** No two adjacent identical among N visible. */
export function adjacentDistinct(count: number): boolean {
  if (count < 2) return true;
  for (let i = 1; i < count; i++) {
    if (paletteForIndex(i).id === paletteForIndex(i - 1).id) return false;
  }
  // With 3 palettes, sequential modulo never repeats adjacent.
  return true;
}
