import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { shared } from "../shared";
import { useStats } from "../game";
import { useGame } from "../store";
import { heatTier } from "../sim/HeatTiers";
import { sim } from "../sim";
import { flag } from "../flags";
import { spatialAudio } from "../audio/SpatialAudio";
import { sfx } from "../audio/sfx";

/**
 * §3.2 Heat escalation visuals — heli scout marker at ★3+, roadblock
 * barriers at ★4+, and pitEligible on shared for pursuit consumers.
 * Independent of the full Police pursuit mount.
 */

const HELI_ORBIT_R = 28;
const HELI_ORBIT_H = 22;
const ROADBLOCK_AHEAD = 55;

interface Block {
  x: number;
  z: number;
  yaw: number;
}

export function HeatResponse() {
  const heli = useRef<THREE.Group>(null);
  const blocks = useRef<Block[]>([]);
  const blockMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const lastStars = useRef(0);
  const sirenSpatialAcc = useRef(0);
  const blockSlots = useMemo(() => [0, 1], []);

  useFrame((_, dt) => {
    const game = useGame.getState();
    if (game.paused || game.down) {
      if (heli.current) heli.current.visible = false;
      sfx.siren(false);
      return;
    }
    const stars = Math.floor(useStats.getState().police);
    const tier = heatTier(stars);
    shared.pitEligible = tier.pit;

    const body =
      (game.mode === "car" ? shared.car : game.mode === "boat" ? shared.boat : shared.player)?.translation() ??
      null;
    if (!body) {
      if (heli.current) heli.current.visible = false;
      return;
    }

    // §9.2 spatial siren at nearest live cop while chase audio is active.
    const liveCops = shared.cops.filter((c) => !c.dead);
    const sirenOn = stars >= 3 && (liveCops.length > 0 || tier.helicopter);
    sfx.siren(sirenOn && liveCops.length > 0);
    if (sirenOn) {
      sirenSpatialAcc.current += dt;
      if (sirenSpatialAcc.current >= 1.4) {
        sirenSpatialAcc.current = 0;
        let nx = body.x;
        let nz = body.z;
        let best = Infinity;
        for (const c of liveCops) {
          const d = Math.hypot(c.pos.x - body.x, c.pos.z - body.z);
          if (d < best) {
            best = d;
            nx = c.pos.x;
            nz = c.pos.z;
          }
        }
        if (liveCops.length === 0 && heli.current?.visible) {
          nx = heli.current.position.x;
          nz = heli.current.position.z;
        }
        spatialAudio.playAt(nx, 1.2, nz, { duration: 0.35, freq: 780, gain: 0.12 });
      }
    } else {
      sirenSpatialAcc.current = 0;
    }

    // ★3+ heli scout — gated by flag.helicopter (expensive tier).
    const showHeli = tier.helicopter && flag("helicopter");
    if (heli.current) {
      heli.current.visible = showHeli;
      if (showHeli) {
        const t = performance.now() * 0.00055;
        heli.current.position.set(
          body.x + Math.cos(t) * HELI_ORBIT_R,
          HELI_ORBIT_H,
          body.z + Math.sin(t) * HELI_ORBIT_R,
        );
        heli.current.rotation.y = t + Math.PI / 2;
      }
    }

    // ★4+ roadblocks ahead on the road graph (1–2 barriers).
    if (tier.roadblocks && stars !== lastStars.current) {
      blocks.current = pickRoadblocks(body.x, body.z, shared.carYaw ?? shared.heading, stars >= 5 ? 2 : 1);
    }
    if (!tier.roadblocks) blocks.current = [];
    lastStars.current = stars;

    for (let i = 0; i < blockSlots.length; i++) {
      const mesh = blockMeshes.current[i];
      if (!mesh) continue;
      const b = blocks.current[i];
      if (!b) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(b.x, 0.55, b.z);
      mesh.rotation.y = b.yaw;
      // Mild idle rock so they read as temporary barriers.
      mesh.position.y = 0.55 + Math.sin(performance.now() * 0.004 + i) * 0.02;
    }

    void dt;
  });

  return (
    <group>
      <group ref={heli} visible={false}>
        {/* simple scout marker — dark fuselage + rotor disc */}
        <mesh>
          <boxGeometry args={[2.4, 0.55, 5.2]} />
          <meshStandardMaterial color="#1a1e28" roughness={0.55} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0.55, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[3.2, 3.2, 0.08, 16]} />
          <meshStandardMaterial color="#3a4558" transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshStandardMaterial color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={1.6} />
        </mesh>
      </group>

      {blockSlots.map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            blockMeshes.current[i] = el;
          }}
          visible={false}
          castShadow
        >
          <boxGeometry args={[4.2, 1.1, 0.55]} />
          <meshStandardMaterial color="#c45a12" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function pickRoadblocks(px: number, pz: number, yaw: number, count: number): Block[] {
  const graph = sim.roadGraph;
  const fwdX = Math.sin(yaw);
  const fwdZ = Math.cos(yaw);
  const aheadX = px + fwdX * ROADBLOCK_AHEAD;
  const aheadZ = pz + fwdZ * ROADBLOCK_AHEAD;
  const out: Block[] = [];

  if (graph) {
    const id = graph.nearestNode(aheadX, aheadZ, 90);
    if (id != null) {
      const n = graph.node(id);
      if (n) {
        out.push({ x: n.x, z: n.z, yaw: yaw + Math.PI / 2 });
        if (count > 1) {
          const neigh = graph.neighbors(id);
          if (neigh.length) {
            const o = graph.node(neigh[0].to);
            if (o) out.push({ x: o.x, z: o.z, yaw: yaw + Math.PI / 2 });
          }
        }
      }
    }
  }

  // Fallback: place barriers in front of the player even without a graph.
  while (out.length < count) {
    const k = out.length + 1;
    out.push({
      x: px + fwdX * (ROADBLOCK_AHEAD + k * 8),
      z: pz + fwdZ * (ROADBLOCK_AHEAD + k * 8),
      yaw: yaw + Math.PI / 2,
    });
  }
  return out.slice(0, count);
}
