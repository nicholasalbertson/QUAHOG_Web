// §12.3.1/12.3.2 — GC hygiene audit regression guard: the hot paths
// (per-frame useFrame bodies) must not allocate. This is a source-level
// check — it fails if a per-frame `new` is reintroduced at a fixed site.
// Event-gated allocations (shooting, impacts, melee) are out of scope:
// they fire on input, not every frame.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const src = (p: string) => readFileSync(join(ROOT, "src", p), "utf-8");

// The useFrame body of a file: from the first `useFrame(` to the matching
// close is hard to parse reliably, so these tests target the exact fixed
// sites (the audit's findings) instead of a full parse.
describe("§12.3 per-frame allocation audit", () => {
  it("Boat uses scratch vectors for forward/normal-forward (no per-frame Vector3)", () => {
    const b = src("actors/Boat.tsx");
    expect(b).not.toContain("new THREE.Vector3(Math.sin(yaw)");
    expect(b).toContain("const _fwd = new THREE.Vector3()");
    expect(b).toContain("const _nfwd = new THREE.Vector3()");
  });

  it("FollowCamera uses a scratch forward in first-person (no per-frame Vector3)", () => {
    const f = src("actors/FollowCamera.tsx");
    expect(f).not.toContain("new THREE.Vector3(Math.sin(heading)");
    expect(f).toContain("const _fwd = new THREE.Vector3()");
  });

  it("SkidMarks uses a scratch Euler (no per-drop Euler allocation)", () => {
    const s = src("world/SkidMarks.tsx");
    expect(s).not.toContain("new THREE.Euler(_flat.x");
    expect(s).toContain("const _eul = new THREE.Euler(0, 0, 0, \"YXZ\")");
  });

  it("StreetLife steers peds with the module scratch (no per-ped Vector3)", () => {
    const s = src("world/StreetLife.tsx");
    expect(s).not.toContain("new THREE.Vector3().subVectors(p.goal, p.pos)");
    expect(s).toContain("const to = _dir.subVectors(p.goal, p.pos)");
  });

  it("earth TileNpcs steers peds with a scratch (no per-ped Vector3)", () => {
    const p = src("earth/PlayWorld.tsx");
    expect(p).not.toContain("new THREE.Vector3(p.goal.x - p.pos.x");
    expect(p).toContain("const _pedTo = new THREE.Vector3()");
  });

  it("Player/Car keep scratch vectors for their hot paths", () => {
    expect(src("actors/Player.tsx")).toContain("const _fwd = new THREE.Vector3()");
    expect(src("actors/Car.tsx")).toContain("const _fwd = new THREE.Vector3()");
  });
});
