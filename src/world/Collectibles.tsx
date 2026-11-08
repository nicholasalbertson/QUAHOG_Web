import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import { useGame, useToasts } from "../store";
import { useStats } from "../game";
import { sfx } from "../audio/sfx";
import { loadJSON, saveJSON } from "../storage";

// Hidden collectibles (§18): scrimshaw "whaling artifacts" scattered around the
// core. Walk into one to grab it — small cash bounty + a toast. Persisted.

const KEY = "mounthope.scrimshaw.v1";
const REWARD = 120;
export const SPOTS: [number, number, number][] = [
  [-272, 1.2, 106], [-244, 1.2, 70], [-300, 1.2, 130], [-210, 1.2, 100],
  [-330, 1.2, 80], [-256, 1.2, 150], [-225, 1.2, 60], [-290, 1.2, 175],
  // Fall River (§7.2.1 — 3 scrimshaw): on the nearest walkable road to each
  // landmark (slice-fallriver.json; world = [east, -north]). Old saves hold an
  // 8-entry array; loadJSON returns it as-is and the new indices read as
  // uncollected (undefined = falsy), so no migration is needed.
  [-19980.2, 1.2, -7757.4], // Heritage State Park
  [-20295.0, 1.2, -7361.8], // Portas Da Cidade
  [-19446.0, 1.2, -8025.0], // Children's Museum of Greater Fall River
];
export const SCRIMSHAW_TOTAL = SPOTS.length;

function loadGot(): boolean[] {
  return loadJSON<boolean[]>(KEY, SPOTS.map(() => false));
}

export function Collectibles() {
  const got = useRef<boolean[]>(loadGot());
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  // publish the loaded count so the HUD can show a found/total tally
  useEffect(() => { useGame.getState().setScrimshaw(got.current.filter(Boolean).length); }, []);

  useFrame((state, dt) => {
    if (useGame.getState().paused) return;
    const body = useGame.getState().mode === "car" ? shared.car : shared.player;
    const t = body?.translation();
    SPOTS.forEach((s, i) => {
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
        useToasts.getState().push(`Scrimshaw ${n}/${SPOTS.length} · +$${REWARD}`, "#ffd24a");
        saveJSON(KEY, got.current);
      }
    });
  });

  return (
    <group>
      {SPOTS.map((s, i) => (
        <mesh key={i} ref={(el) => (meshes.current[i] = el)} position={s} visible={!got.current[i]}>
          <octahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#f3ead2" emissive="#caa24a" emissiveIntensity={0.7} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
