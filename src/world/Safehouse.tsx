import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { markerFade } from "./markerVisual";
import { shared } from "../shared";
import { useStats } from "../game";
import { useGame, useToasts } from "../store";
import { consumeTap } from "../input";
import { SAFEHOUSE_POS } from "./LoseHeatZone";

// Safehouse (§15): a marked spot that bleeds off police + faction heat while the
// player is inside its radius (via LoseHeatZone), and saves the game.
// Simple interior (floor+walls+ceiling) appears on foot inside the radius.

const POS = SAFEHOUSE_POS;
const RADIUS = 9;

export function Safehouse() {
  const ring = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);
  const inside = useRef(false);
  const saveAcc = useRef(0);
  const [showInterior, setShowInterior] = useState(false);

  useFrame((_, dt) => {
    const game = useGame.getState();
    if (game.paused) return;
    const body = game.mode === "car" ? shared.car : shared.player;
    const t = body?.translation();
    const here = !!t && Math.hypot(t.x - POS[0], t.z - POS[2]) < RADIUS;
    const onFootInside = here && game.mode === "foot";
    const entered = here && !inside.current; // rising edge
    inside.current = here;
    if (showInterior !== onFootInside) setShowInterior(onFootInside);

    if (entered && game.mode === "foot") {
      useToasts.getState().push("Safehouse — press T to sleep til morning", "#7ad9ff");
    }
    if (here) {
      const stats = useStats.getState();
      // Heat bleed is handled by LoseHeatZone (same radius/rate).
      saveAcc.current += dt;
      if (saveAcc.current > 3) {
        saveAcc.current = 0;
        stats.save();
      }
      // sleep (T, on foot): skip to 7am, advance the day, heal, clear heat, save
      if (game.mode === "foot" && consumeTap("KeyT")) {
        shared.hour = 7;
        shared.day += 1;
        stats.setHealth(100);
        stats.heat(-5, -5); // fully clear both wanted axes
        stats.save();
        useToasts.getState().push(`Slept til morning — Day ${shared.day}, 07:00`, "#7ad9ff");
      }
    }
    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial;
      const base = here ? (onFootInside ? 0.18 : 0.42) : 0.19;
      m.opacity = base * markerFade(Math.hypot(camera.position.x - POS[0], camera.position.z - POS[2]));
      ring.current.visible = m.opacity > 0.01;
    }
  });

  return (
    <group position={POS}>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[8, 4, 8]} />
        <meshStandardMaterial color="#3a4a6a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.4, 0]} castShadow>
        <coneGeometry args={[6.2, 2.4, 4]} />
        <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
      </mesh>
      {showInterior && (
        <group>
          {/* floor */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[7.2, 0.1, 7.2]} />
            <meshStandardMaterial color="#2a3344" roughness={0.95} />
          </mesh>
          {/* walls */}
          <mesh position={[0, 1.6, -3.5]}>
            <boxGeometry args={[7.2, 3.2, 0.15]} />
            <meshStandardMaterial color="#4a5568" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.6, 3.5]}>
            <boxGeometry args={[7.2, 3.2, 0.15]} />
            <meshStandardMaterial color="#4a5568" roughness={0.85} />
          </mesh>
          <mesh position={[-3.5, 1.6, 0]}>
            <boxGeometry args={[0.15, 3.2, 7.2]} />
            <meshStandardMaterial color="#445062" roughness={0.85} />
          </mesh>
          <mesh position={[3.5, 1.6, 0]}>
            <boxGeometry args={[0.15, 3.2, 7.2]} />
            <meshStandardMaterial color="#445062" roughness={0.85} />
          </mesh>
          {/* ceiling */}
          <mesh position={[0, 3.25, 0]}>
            <boxGeometry args={[7.2, 0.12, 7.2]} />
            <meshStandardMaterial color="#1e2633" roughness={1} />
          </mesh>
        </group>
      )}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.15, 0]}>
        <ringGeometry args={[RADIUS - 0.25, RADIUS, 36]} />
        <meshBasicMaterial color="#4ad66d" transparent opacity={0.19} depthWrite={false} />
      </mesh>
    </group>
  );
}
