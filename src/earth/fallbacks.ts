// Earth fallbacks (§2.10) — pure predicates, so the fallback decisions are
// testable without a canvas.
//
// §2.10.1 — fallback ground plane: when the tiles fail (a classified fault
// or the tiles-missing signal), the world renders a large flat plane at the
// frame origin (y=0, the ellipsoid surface at the anchor) instead of void.
// It is a visual safety net, not real terrain: in hilly areas it may sit
// below the player's last ground height (the player keeps their height —
// the PlayerRig does not move them when the ground sample returns null).
// §2.10.2 — fallback sky: the solid background color (wx.bg) is always
// rendered; if the Sky component fails, the color remains. Pre-existing.
// §2.10.4 — forced tile 500 / unavailable: show fallbackNotice + keep
// movement on FALLBACK_GROUND (never blank canvas).
import { fallbackNotice } from "../sim/FallbackGround";
import type { TileFault } from "./tileFault";

export interface EarthFaultState {
  fault: boolean; // a classified tile fault (401/403/429/5xx)
  tilesProblem: boolean; // the tiles-missing signal (TilesDiag onMissing)
}

export function shouldShowFallbackGround(s: EarthFaultState): boolean {
  return s.fault || s.tilesProblem;
}

/** Fallback ground plane size (m) — covers the play area around the spawn. */
export const FALLBACK_GROUND_SIZE = 4000;

/** §2.10.4 — player-facing notice when fallback ground is active. */
export function earthFallbackNotice(
  fault: TileFault | null,
  tilesProblem: boolean,
): string | null {
  if (!fault && !tilesProblem) return null;
  if (fault?.kind === "unavailable" && fault.status != null && fault.status >= 500 && fault.status <= 599) {
    return fallbackNotice("tile-500");
  }
  if (fault?.kind === "unauthorized") return fallbackNotice("auth");
  if (fault?.kind === "unavailable" || tilesProblem) return fallbackNotice("network");
  // A 400 with no API-key text is a tile/session failure, not a missing sky map.
  if (fault) return fallbackNotice("network");
  return fallbackNotice("tile-500");
}
