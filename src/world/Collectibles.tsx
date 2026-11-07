import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import { useGame, useToasts } from "../store";
import { useStats } from "../game";
import { sfx } from "../audio/sfx";
import { loadJSON, saveJSON } from "../storage";
import { SCRIMSHAW_SPOTS, SCRIMSHAW_TOTAL } from "../content/scrimshawSpots";

export { SCRIMSHAW_SPOTS, SCRIMSHAW_TOTAL };

// Hidden collectibles (§18 / §6.4): scrimshaw across NB, Fall River, Brockton,
// and the Cape. Expanding SPOTS pads older saves with false.

const KEY = "mounthope.scrimshaw.v1";
const REWARD = 120;

function loadGot(): boolean[] {
  const saved = loadJSON<boolean[]>(KEY, []);
  return SCRIMSHAW_SPOTS.map((_, i) => !!saved[i]);
}

export function Collectibles() {
  const got = useRef<boolean[]>(loadGot());
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(() => { useGame.getState().setScrimshaw(got.current.filter(Boolean).length); }, []);

  useFrame((state, dt) => {
    if (useGame.getState().paused) return;
    const body = useGame.getState().mode === "car" ? shared.car : shared.player;
    const t = body?.translation();
    SCRIMSHAW_SPOTS.forEach((s, i) => {
      const m = meshes.current[i];
      if (!m) return;
      if (got.current[i]) { m.visible = false; return; }
      m.rotation.y += dt * 2;
      m.position.y = s[1] + Math.sin(state.clock.elapsedTime * 2 + i) * 0.2;
      if (t && Math.hypot(t.x - s[0], t.z - s[2]) < 3) {
        got.current[i] = true;
        m.visible = false;
        useStats.getState().addCash(REWARD);
        sfx.cash();
        const n = got.current.filter(Boolean).length;
        useGame.getState().setScrimshaw(n);
        useToasts.getState().push(`Scrimshaw ${n}/${SCRIMSHAW_TOTAL} · +$${REWARD}`, "#ffd24a");
        saveJSON(KEY, got.current);
      }
    });
  });

  return (
    <group>
      {SCRIMSHAW_SPOTS.map((s, i) => (
        <mesh key={i} ref={(el) => (meshes.current[i] = el)} position={s} visible={!got.current[i]}>
          <octahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#f3ead2" emissive="#caa24a" emissiveIntensity={0.7} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
