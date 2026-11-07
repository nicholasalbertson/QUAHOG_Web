import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useGame } from "../store";
import {
  BATTLESHIP_COVE,
  LIZZIE_BORDEN,
  DARTMOUTH_MALL,
  CAPPIELLO_GYM,
  HYANNIS_MARINA,
  KENNEDY_COMPOUND,
} from "../places";

// Hand-placed hero landmarks (§37/§28 / §7.2–§7.3). Stylized but recognizable.
// Mounted per active district so distant districts do not keep heavy meshes alive.

function Battleship() {
  const grey = "#6b7178", deck = "#4a4f56", steel = "#565b62";
  const turret = (z: number) => (
    <group position={[0, 6.2, z]}>
      <mesh castShadow><boxGeometry args={[7, 2.2, 7]} /><meshStandardMaterial color={steel} roughness={0.6} metalness={0.4} /></mesh>
      {[-1.4, 0, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 0.4, 7]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.45, 0.45, 12, 10]} /><meshStandardMaterial color="#3e434a" metalness={0.5} roughness={0.5} /></mesh>
      ))}
    </group>
  );
  return (
    <RigidBody type="fixed" colliders={false} position={BATTLESHIP_COVE} rotation={[0, 0.4, 0]}>
      <CuboidCollider args={[14, 5.5, 100]} position={[0, 3, 0]} />
      <mesh castShadow position={[0, 3, 0]}><boxGeometry args={[28, 8, 200]} /><meshStandardMaterial color={grey} roughness={0.65} metalness={0.35} /></mesh>
      <mesh castShadow position={[0, 3, 104]} rotation-y={Math.PI / 4}><boxGeometry args={[19.8, 8, 19.8]} /><meshStandardMaterial color={grey} roughness={0.65} metalness={0.35} /></mesh>
      <mesh position={[0, 7.1, -6]}><boxGeometry args={[26, 0.4, 188]} /><meshStandardMaterial color={deck} roughness={0.8} /></mesh>
      <mesh castShadow position={[0, 11, -10]}><boxGeometry args={[16, 8, 40]} /><meshStandardMaterial color={steel} roughness={0.6} metalness={0.4} /></mesh>
      <mesh castShadow position={[0, 18, -16]}><boxGeometry args={[10, 8, 16]} /><meshStandardMaterial color={steel} roughness={0.6} metalness={0.4} /></mesh>
      <mesh castShadow position={[0, 30, -18]}><boxGeometry args={[5, 18, 5]} /><meshStandardMaterial color={steel} roughness={0.6} metalness={0.4} /></mesh>
      <mesh position={[0, 42, -18]}><cylinderGeometry args={[0.2, 0.2, 8, 6]} /><meshStandardMaterial color="#2a2e33" /></mesh>
      <mesh castShadow position={[0, 16, 6]}><cylinderGeometry args={[3, 3.4, 8, 12]} /><meshStandardMaterial color="#3e434a" roughness={0.7} /></mesh>
      {turret(60)}
      {turret(40)}
      {turret(-66)}
      <Text position={[0, 9, 30]} fontSize={3.2} color="#dfe4e8" anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#000">MASSACHUSETTS</Text>
    </RigidBody>
  );
}

function LizzieBorden() {
  const body = "#5a6b5e", trim = "#e8e4d8", roof = "#3a3a3e";
  return (
    <RigidBody type="fixed" colliders={false} position={LIZZIE_BORDEN}>
      <CuboidCollider args={[4.5, 4, 5.5]} position={[0, 4, 0]} />
      <mesh castShadow receiveShadow position={[0, 4, 0]}><boxGeometry args={[9, 8, 11]} /><meshStandardMaterial color={body} roughness={0.85} /></mesh>
      <mesh castShadow position={[0, 9.4, 0]} rotation-y={Math.PI / 2}><cylinderGeometry args={[3.6, 3.6, 9.2, 3]} /><meshStandardMaterial color={roof} roughness={0.9} flatShading /></mesh>
      <mesh castShadow position={[0, 2, 6]}><boxGeometry args={[6, 4, 2.4]} /><meshStandardMaterial color={trim} roughness={0.8} /></mesh>
      <mesh position={[2.6, 11, -1]}><boxGeometry args={[1.1, 4, 1.1]} /><meshStandardMaterial color="#6e4a3e" /></mesh>
      <Text position={[0, 6.4, 5.7]} fontSize={0.5} color="#1a1a1a" anchorX="center" anchorY="middle">LIZZIE BORDEN HOUSE</Text>
    </RigidBody>
  );
}

function DartmouthMall() {
  return (
    <RigidBody type="fixed" colliders={false} position={DARTMOUTH_MALL}>
      <CuboidCollider args={[75, 6, 35]} position={[0, 6, -20]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 40]} receiveShadow><planeGeometry args={[160, 120]} /><meshStandardMaterial color="#3c3f47" roughness={0.95} /></mesh>
      <mesh castShadow receiveShadow position={[0, 6, -20]}><boxGeometry args={[150, 12, 70]} /><meshStandardMaterial color="#b8a890" roughness={0.85} /></mesh>
      <mesh position={[0, 12.4, -20]}><boxGeometry args={[152, 1, 72]} /><meshStandardMaterial color="#7a6f5e" /></mesh>
      <mesh castShadow position={[0, 4, 16]}><boxGeometry args={[24, 8, 8]} /><meshStandardMaterial color="#9a8f7e" roughness={0.8} /></mesh>
      <mesh position={[60, 8, 70]}><boxGeometry args={[1.2, 16, 1.2]} /><meshStandardMaterial color="#33373d" /></mesh>
      <mesh position={[60, 14, 70]}><boxGeometry args={[10, 5, 0.6]} /><meshStandardMaterial color="#1f4e79" emissive="#1f4e79" emissiveIntensity={0.4} /></mesh>
      <Text position={[60, 14, 70.4]} fontSize={1.2} color="#fff" anchorX="center" anchorY="middle" maxWidth={9}>DARTMOUTH MALL</Text>
    </RigidBody>
  );
}

/** Brockton — Champion City gym block (Main St). */
function CappielloGym() {
  const brick = "#8a5a4a", trim = "#e8e0d4";
  return (
    <RigidBody type="fixed" colliders={false} position={CAPPIELLO_GYM}>
      <CuboidCollider args={[7, 5, 9]} position={[0, 5, 0]} />
      <mesh castShadow receiveShadow position={[0, 5, 0]}><boxGeometry args={[14, 10, 18]} /><meshStandardMaterial color={brick} roughness={0.9} /></mesh>
      <mesh position={[0, 10.4, 0]}><boxGeometry args={[14.4, 0.8, 18.4]} /><meshStandardMaterial color="#3a3a3e" /></mesh>
      <mesh castShadow position={[0, 3.2, 9.4]}><boxGeometry args={[8, 6.4, 1.2]} /><meshStandardMaterial color={trim} roughness={0.8} /></mesh>
      <Text position={[0, 8.2, 9.6]} fontSize={0.7} color="#1a1a1a" anchorX="center" anchorY="middle" maxWidth={12}>
        CAPPIELLO BOXING GYM
      </Text>
    </RigidBody>
  );
}

/** Hyannis Marina — slip house + pier mass. */
function HyannisMarina() {
  const white = "#f0f2f4", navy = "#1f3a5f";
  return (
    <RigidBody type="fixed" colliders={false} position={HYANNIS_MARINA}>
      <CuboidCollider args={[10, 3, 14]} position={[0, 3, 0]} />
      <mesh castShadow receiveShadow position={[0, 3, 0]}><boxGeometry args={[20, 6, 28]} /><meshStandardMaterial color={white} roughness={0.55} /></mesh>
      <mesh position={[0, 6.4, 0]}><boxGeometry args={[21, 0.6, 29]} /><meshStandardMaterial color={navy} /></mesh>
      <mesh position={[0, 0.2, 18]} rotation-x={-Math.PI / 2}><planeGeometry args={[12, 20]} /><meshStandardMaterial color="#6a7178" roughness={0.95} /></mesh>
      <Text position={[0, 5.2, 14.2]} fontSize={0.85} color={navy} anchorX="center" anchorY="middle" maxWidth={16}>
        HYANNIS MARINA
      </Text>
    </RigidBody>
  );
}

/** Hyannis Port — compound gatehouse mass. */
function KennedyCompound() {
  const cedar = "#6e5a45", white = "#f4f1ea";
  return (
    <RigidBody type="fixed" colliders={false} position={KENNEDY_COMPOUND}>
      <CuboidCollider args={[12, 4, 10]} position={[0, 4, 0]} />
      <mesh castShadow receiveShadow position={[0, 4, 0]}><boxGeometry args={[24, 8, 20]} /><meshStandardMaterial color={cedar} roughness={0.88} /></mesh>
      <mesh castShadow position={[0, 9.2, 0]} rotation-y={Math.PI / 2}><cylinderGeometry args={[6, 6, 24, 3]} /><meshStandardMaterial color="#4a4038" roughness={0.9} flatShading /></mesh>
      <mesh castShadow position={[0, 2.4, 11]}><boxGeometry args={[10, 4.8, 2]} /><meshStandardMaterial color={white} roughness={0.8} /></mesh>
      <Text position={[0, 6.6, 11.2]} fontSize={0.55} color="#1a1a1a" anchorX="center" anchorY="middle" maxWidth={14}>
        KENNEDY COMPOUND
      </Text>
    </RigidBody>
  );
}

export function Heroes() {
  const district = useGame((s) => s.district);
  return (
    <group>
      {district === "newBedford" && <DartmouthMall />}
      {district === "fallRiver" && (
        <>
          <Battleship />
          <LizzieBorden />
        </>
      )}
      {district === "brockton" && <CappielloGym />}
      {district === "cape" && (
        <>
          <HyannisMarina />
          <KennedyCompound />
        </>
      )}
    </group>
  );
}
