import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame, useToasts } from "../store";
import { useStats } from "../game";
import { sfx } from "../audio/sfx";
import { shared } from "../shared";
import { advanceJob, chasePoint, currentJob, jobClock, tickJob } from "../earth/jobs";
import { LicensedHuman } from "../actors/LicensedHuman";
import { Character } from "../world/Character";
import { coastTarget, reachedPin } from "./coastWorld";

// Same chapter list the tiles build runs. Pins are latitude and longitude,
// drawn here in the New Bedford slice frame the street build already uses.
export function CoastCampaign() {
  const root = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const game = useGame.getState();
    if (!game.started || game.paused) return;
    const job = currentJob();
    const group = root.current;
    if (!job || !group) {
      if (group) group.visible = false;
      return;
    }
    const body = game.mode === "car" ? shared.car : shared.player;
    const pos = body?.translation();
    if (!pos) return;
    const point = chasePoint(job.step, jobClock());
    const pin = coastTarget(point.lat, point.lon);
    group.visible = true;
    group.position.set(pin.x, 0, pin.z);
    const heat = useStats.getState().police;
    if (tickJob(Math.min(dt, 0.05), heat) === "fail") {
      useToasts.getState().push("Failed. Back to the last checkpoint.", "#ff8a8a");
    }
    const driving = game.mode === "car";
    if (!reachedPin(pos.x, pos.z, pin, job.step.radius)) return;
    if (job.step.needCar && !driving) return;
    if (job.step.noHeat && heat >= 0.8) return;
    const moved = advanceJob();
    if (!moved) return;
    if (moved.reward) {
      useStats.getState().addCash(moved.reward);
      sfx.cash();
      useToasts.getState().push(`+$${moved.reward}`, "#7CFC00");
    }
    useToasts.getState().push(moved.finished ? `${job.job.title} complete.` : moved.text, "#ffcf4a");
  });

  return (
    <group ref={root} visible={false}>
      <LicensedHuman
        slot={2}
        moving={() => false}
        fallback={<Character shirt="#c4552a" pants="#2c2f3a" moving={() => false} />}
      />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.15, 0]}>
        <ringGeometry args={[1.4, 1.7, 24]} />
        <meshBasicMaterial color="#ffcf4a" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
