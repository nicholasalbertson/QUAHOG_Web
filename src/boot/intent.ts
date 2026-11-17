// Which build the player asked for on the shared boot screen.
// sessionStorage so a reload starts at the boot screen again, and so the
// heavy world chunk is not fetched until they choose.

export type BootIntent = "street-new" | "street-continue" | "earth-new" | "earth-continue";

const KEY = "mh.boot";

export const BUILD_LINKS = {
  earth: { href: "./earth.html", label: "3D Tiles" },
  street: { href: "./index.html", label: "Street map" },
} as const;

export function stashBoot(intent: BootIntent): void {
  try { sessionStorage.setItem(KEY, intent); } catch { /* private mode */ }
}

export function peekBoot(): BootIntent | null {
  try {
    const value = sessionStorage.getItem(KEY);
    if (value === "street-new" || value === "street-continue" || value === "earth-new" || value === "earth-continue") return value;
    return null;
  } catch {
    return null;
  }
}

export function clearBoot(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* private mode */ }
}
