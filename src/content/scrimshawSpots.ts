/**
 * Scrimshaw collectible world positions (§6.4 / §7.2–§7.3).
 * Shared by Collectibles UI and WorldManifest (no React dependency).
 */

/** World [x, y, z] — y is bob baseline. */
export const SCRIMSHAW_SPOTS: [number, number, number][] = [
  // New Bedford core (original 8)
  [-272, 1.2, 106], [-244, 1.2, 70], [-300, 1.2, 130], [-210, 1.2, 100],
  [-330, 1.2, 80], [-256, 1.2, 150], [-225, 1.2, 60], [-290, 1.2, 175],
  // Fall River
  [-19960, 1.2, -7360],
  [-19580, 1.2, -7090],
  [-19470, 1.2, -7210],
  // Brockton
  [-8295, 1.2, -49670],
  [-8240, 1.2, -49640],
  // Cape Cod — Hyannis
  [53810, 1.2, -1630],
  [51440, 1.2, 660],
];

export const SCRIMSHAW_TOTAL = SCRIMSHAW_SPOTS.length;
