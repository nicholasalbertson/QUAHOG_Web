import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import { useGame } from "../store";
import { districtOfWorld } from "../districts";

/**
 * Auto district switch — when the player dwells in a different district's
 * world bbox for >1.5s, mirror BigMap fast-travel: setPendingFastTravel to
 * the current position, then setDistrict (Experience remounts + App.onReady
 * teleports).
 */
const DWELL_SEC = 1.5;

export function DistrictSeam() {
  const dwell = useRef(0);
  const lastForeign = useRef<string | null>(null);

  useFrame((_, dt) => {
    const game = useGame.getState();
    if (!game.started || game.paused || game.down) {
      dwell.current = 0;
      return;
    }
    const body =
      (game.mode === "car" ? shared.car : game.mode === "boat" ? shared.boat : shared.player)?.translation() ??
      null;
    if (!body) return;

    const here = districtOfWorld(body.x, body.z);
    if (here === game.district) {
      dwell.current = 0;
      lastForeign.current = null;
      return;
    }
    if (lastForeign.current !== here) {
      lastForeign.current = here;
      dwell.current = 0;
    }
    dwell.current += dt;
    if (dwell.current < DWELL_SEC) return;
    dwell.current = 0;
    useGame.getState().setPendingFastTravel({ x: body.x, z: body.z });
    useGame.getState().setDistrict(here);
  });

  return null;
}
