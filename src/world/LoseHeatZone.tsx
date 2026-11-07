import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { shared } from "../shared";
import { useGame, useToasts } from "../store";
import { useStats } from "../game";
import { HOSPITAL, POLICE_STATION } from "../places";

/** Safehouse world position (matches Safehouse.tsx). */
export const SAFEHOUSE_POS: [number, number, number] = [-188, 0, 40];

export interface HeatZoneSpec {
  x: number;
  z: number;
  r: number;
  /** Extra police/faction heat drained per second while inside. */
  rate: number;
  label: string;
}

/** Civic go-to-ground radii that accelerate heat decay. */
export const LOSE_HEAT_ZONES: readonly HeatZoneSpec[] = [
  { x: SAFEHOUSE_POS[0], z: SAFEHOUSE_POS[2], r: 9, rate: 1.2, label: "safehouse" },
  { x: HOSPITAL[0], z: HOSPITAL[2], r: 12, rate: 0.9, label: "hospital" },
  { x: POLICE_STATION[0], z: POLICE_STATION[2], r: 14, rate: 0.75, label: "police" },
];

/**
 * Accelerates dual-axis heat decay while the player is inside a civic
 * go-to-ground radius (safehouse / hospital / police station).
 */
export function LoseHeatZone() {
  const toastOnce = useRef(false);

  useFrame((_, dt) => {
    const game = useGame.getState();
    if (!game.started || game.paused) return;
    const st = useStats.getState();
    if (st.police < 1 && st.faction < 1) {
      toastOnce.current = false;
      return;
    }
    const body = (game.mode === "car" ? shared.car : shared.player)?.translation();
    if (!body) return;
    const zone = LOSE_HEAT_ZONES.find((z) => Math.hypot(body.x - z.x, body.z - z.z) <= z.r);
    if (!zone) return;
    // Civic cool-down applies even at APB — you're inside a building.
    st.heat(-dt * zone.rate, -dt * zone.rate);
    if (!toastOnce.current && st.police > 0) {
      toastOnce.current = true;
      useToasts.getState().push("Laying low — heat dropping", "#7CFC00");
    }
  });

  return null;
}

/** @deprecated use LoseHeatZone — kept as alias for multi-zone mounts */
export function LoseHeatZones() {
  return <LoseHeatZone />;
}
