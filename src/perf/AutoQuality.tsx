import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../store";
import { nextStreetTier, type StreetTier } from "./frameTier";

// Steps the street-build graphics down when frames stay slow. The tiles
// build has its own scaler. This one only steps down.
export function AutoQuality() {
  const samples = useRef<number[]>([]);
  const cool = useRef(0);
  useFrame((_, dt) => {
    cool.current = Math.max(0, cool.current - 1);
    samples.current.push(Math.min(dt, 0.25));
    if (samples.current.length > 90) samples.current.shift();
    if (cool.current > 0 || samples.current.length < 60 || samples.current.length % 30 !== 0) return;
    const mean = samples.current.reduce((sum, n) => sum + n, 0) / samples.current.length;
    const current = useGame.getState().quality as StreetTier;
    const next = nextStreetTier(current, mean, samples.current.length);
    if (next !== current) {
      useGame.getState().setQuality(next);
      cool.current = 120;
      samples.current = [];
    }
  });
  return null;
}
