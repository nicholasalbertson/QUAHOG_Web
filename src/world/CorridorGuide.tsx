import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useMission } from "../mission";
import { CORRIDORS, I195_NB_FR } from "../content/corridor";

const GUIDE_TITLES = new Set(["Spindle City", "Big Mamie"]);

function debugOn(): boolean {
  try {
    return new URLSearchParams(location.search).has("debug");
  } catch {
    return false;
  }
}

/**
 * Mission corridor rings along I-195 (NB → FR) when Spindle City / Big Mamie
 * are active. Also draws debug ribbons for all planned corridors (?debug).
 */
export function CorridorGuide() {
  const title = useMission((s) => s.title);
  const done = useMission((s) => s.done);
  const failed = useMission((s) => s.failed);
  const showMission = !done && !failed && GUIDE_TITLES.has(title);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const waypoints = useMemo(() => {
    const def = CORRIDORS.find((c) => c.id === "nb-fr-195");
    return def?.waypoints ?? I195_NB_FR;
  }, []);

  useFrame(() => {
    const t = performance.now() * 0.002;
    for (let i = 0; i < rings.current.length; i++) {
      const m = rings.current[i];
      if (!m) continue;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.28 + 0.18 * Math.sin(t + i * 0.7);
      m.rotation.z = t * 0.15;
    }
  });

  const debugLines = useMemo(() => {
    if (!debugOn()) return [];
    return CORRIDORS.filter((c) => c.status !== "live").map((c) => {
      const pts = c.waypoints.map(([x, z]) => new THREE.Vector3(x, 1.2, z));
      return { id: c.id, pts, color: c.status === "scaffolded" ? "#6ab0ff" : "#8866aa" };
    });
  }, []);

  return (
    <group>
      {showMission &&
        waypoints.map(([x, z], i) => (
          <mesh
            key={`ring-${i}`}
            ref={(el) => {
              rings.current[i] = el;
            }}
            position={[x, 0.35, z]}
            rotation-x={-Math.PI / 2}
          >
            <ringGeometry args={[4.2, 5.1, 28]} />
            <meshBasicMaterial color="#6ab0ff" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        ))}

      {debugLines.map((l) => (
        <line key={l.id}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={l.pts.length}
              array={new Float32Array(l.pts.flatMap((p) => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={l.color} transparent opacity={0.55} />
        </line>
      ))}
    </group>
  );
}
