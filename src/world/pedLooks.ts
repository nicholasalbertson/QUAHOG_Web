// Pedestrian looks (§2.7.1/2.7.3) — pure, testable. Three distinct builds
// (silhouettes) + a palette per build. The builds cycle deterministically
// (i % 3), so two adjacent peds in the spawn list always differ in build
// and can never be identical — the §2.7.3 "no two adjacent identical" rule
// holds by construction, not by luck.
export type PedBuild = "default" | "tall" | "stocky";
export const PED_BUILDS: PedBuild[] = ["default", "tall", "stocky"];

/** Root-group scale per build (feet stay at local y=0, so the scale is
 *  about the ground — no floating or sinking). */
export const PED_BUILD_SCALE: Record<PedBuild, [number, number, number]> = {
  default: [1, 1, 1],
  tall: [1, 1.12, 1], // longer legs, higher hips
  stocky: [1.15, 0.95, 1.15], // wider, shorter
};

export const PED_SHIRTS = ["#c0563f", "#3f6cc0", "#4a8c52", "#b8a23a", "#7a4a8c"];
export const PED_PANTS = ["#2c2f3a", "#3a3326", "#23344f", "#4a4a4a"];
export const PED_SKINS = ["#caa07a", "#e0b48c", "#a87a52", "#8a5a36"];

export const PED_HAIR = ["#2a2018", "#1a1a1a", "#6b4a2a", "#c4b49a", "#3a2418"];
export const PED_HATS = ["", "#1c1c1c", "#6b2d2d", "#1d3d2f", "#d8d2c4"];
export const PED_COATS = ["", "#2a2e38", "#5a3a28", "#1e3a4a"];

export interface PedLook {
  build: PedBuild;
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
  /** Empty string means no hat. */
  hat: string;
  /** Empty string means the shirt is the outer layer. */
  coat: string;
}

const pick = <T,>(a: T[], rand: () => number): T => a[Math.floor(rand() * a.length)];

export function assignPedLooks(n: number, rand: () => number = Math.random): PedLook[] {
  return Array.from({ length: n }, (_, i) => ({
    build: PED_BUILDS[i % PED_BUILDS.length],
    shirt: pick(PED_SHIRTS, rand),
    pants: pick(PED_PANTS, rand),
    skin: pick(PED_SKINS, rand),
    hair: pick(PED_HAIR, rand),
    hat: PED_HATS[i % PED_HATS.length],
    coat: PED_COATS[(i + 1) % PED_COATS.length],
  }));
}

/** Two looks are identical only if build + all palette entries match. */
export function looksIdentical(a: PedLook, b: PedLook): boolean {
  return a.build === b.build && a.shirt === b.shirt && a.pants === b.pants && a.skin === b.skin && a.hair === b.hair && a.hat === b.hat && a.coat === b.coat;
}

/** §2.7.3 — no two adjacent looks in the list are identical. */
export function noAdjacentIdentical(looks: PedLook[]): boolean {
  for (let i = 1; i < looks.length; i++) {
    if (looksIdentical(looks[i - 1], looks[i])) return false;
  }
  return true;
}
