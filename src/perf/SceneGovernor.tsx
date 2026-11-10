import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { isMobileDevice } from "../mobile/profile";
import { useGame } from "../store";
import { overBudget, sceneCaps } from "./sceneBudget";

// If the live frame stays over the draw-call or triangle cap, step the
// quality down. The next tier meshes fewer buildings, roads, and people.
export function SceneGovernor() {
  const gl = useThree((s) => s.gl);
  const quality = useGame((s) => s.quality);
  const hot = useRef(0);
  useFrame(() => {
    const caps = sceneCaps(quality, isMobileDevice());
    const over = overBudget(
      { drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles },
      caps,
    );
    if (!over) { hot.current = 0; return; }
    hot.current += 1;
    if (hot.current < 90 || quality <= 0) return;
    hot.current = 0;
    useGame.getState().setQuality((quality - 1) as 0 | 1 | 2);
  });
  return null;
}
