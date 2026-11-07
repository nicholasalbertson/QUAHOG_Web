import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import { useGame } from "../store";
import { useMission } from "../mission";
import { BETHEL_OPENER, defineDialogue } from "../ui/DialogueBox";

/** Seamen's Bethel landmark (world x,z) — matches opener mission target. */
const BETHEL: [number, number] = [-272.23, 106.5];
const RADIUS = 14;

const startBethelChat = defineDialogue(BETHEL_OPENER);

/**
 * Fires dialogue once when entering Bethel proximity — once per mission index.
 */
export function BethelDialogue() {
  const firedFor = useRef<number | null>(null);

  useFrame(() => {
    const game = useGame.getState();
    if (!game.started || game.paused) return;
    const ms = useMission.getState();
    if (ms.done || ms.failed) return;
    if (firedFor.current === ms.mi) return;

    const body = game.mode === "car" ? shared.car : game.mode === "boat" ? shared.boat : shared.player;
    if (!body) return;
    const p = body.translation();
    if (Math.hypot(p.x - BETHEL[0], p.z - BETHEL[1]) > RADIUS) return;

    firedFor.current = ms.mi;
    startBethelChat();
  });

  return null;
}
