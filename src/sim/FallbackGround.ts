/**
 * §2.10 Fallback ground / sky when tiles or env fail — never blank canvas.
 */

export interface FallbackGround {
  size: number;
  color: string;
  y: number;
}

export interface FallbackSky {
  top: string;
  bottom: string;
}

export const FALLBACK_GROUND: FallbackGround = {
  size: 4000,
  color: "#3a4a3c",
  y: 0,
};

export const FALLBACK_SKY: FallbackSky = {
  top: "#6a8aaa",
  bottom: "#c5d2c0",
};

export function fallbackNotice(reason: "tile-500" | "env" | "network" | "auth"): string {
  switch (reason) {
    case "tile-500":
      return "Map tiles unavailable — using fallback ground.";
    case "env":
      return "Environment map failed — using sky gradient.";
    case "network":
      return "Network error — fallback world active.";
    case "auth":
      return "Sign-in required for full tiles — fallback ground stays walkable.";
  }
}
