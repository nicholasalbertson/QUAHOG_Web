// Original traffic bodies. Boxes and a cabin, no imported models.
// Styles cycle so a row of cars is not one silhouette.

const STYLES: { body: string; cabin: string; w: number; h: number; len: number; cabinZ: number }[] = [
  { body: "#c23b3b", cabin: "#d8e2ea", w: 1.7, h: 0.45, len: 4.2, cabinZ: 0.15 },
  { body: "#1f4d8a", cabin: "#c5d4e0", w: 1.8, h: 0.7, len: 4.6, cabinZ: -0.2 },
  { body: "#d8a31a", cabin: "#efe6cf", w: 1.6, h: 0.4, len: 4.0, cabinZ: 0.35 },
  { body: "#2f6b45", cabin: "#d5ddd4", w: 1.9, h: 0.85, len: 4.8, cabinZ: 0.4 },
];

export function ProceduralCar({ style }: { style: number }) {
  const look = STYLES[((style % STYLES.length) + STYLES.length) % STYLES.length];
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[look.w, look.h, look.len]} />
        <meshStandardMaterial color={look.body} roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.45 + look.h * 0.85, look.cabinZ]} castShadow>
        <boxGeometry args={[look.w * 0.86, 0.55, look.len * 0.42]} />
        <meshStandardMaterial color={look.cabin} roughness={0.25} metalness={0.05} />
      </mesh>
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * look.w * 0.42, 0.22, z * look.len * 0.32]}>
          <cylinderGeometry args={[0.22, 0.22, 0.18, 8]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}
