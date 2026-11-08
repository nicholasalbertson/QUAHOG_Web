/**
 * §10.6.3 Graphics preset (ties to quality tiers §12.1).
 */

export type GraphicsPresetId = "low" | "medium" | "high";

export interface GraphicsPreset {
  id: GraphicsPresetId;
  quality: 0 | 1 | 2;
  shadow: boolean;
  post: boolean;
  pedCap: number;
  trafficCap: number;
}

export const GRAPHICS_PRESETS: Record<GraphicsPresetId, GraphicsPreset> = {
  low: { id: "low", quality: 0, shadow: false, post: false, pedCap: 16, trafficCap: 10 },
  medium: { id: "medium", quality: 1, shadow: true, post: false, pedCap: 28, trafficCap: 16 },
  high: { id: "high", quality: 2, shadow: true, post: true, pedCap: 40, trafficCap: 24 },
};

const KEY = "quahog.graphicsPreset.v1";

export function loadGraphicsPreset(storage: Storage = localStorage): GraphicsPresetId {
  const v = storage.getItem(KEY);
  if (v === "low" || v === "medium" || v === "high") return v;
  return "medium";
}

export function saveGraphicsPreset(id: GraphicsPresetId, storage: Storage = localStorage): void {
  storage.setItem(KEY, id);
}

export function presetOf(id: GraphicsPresetId): GraphicsPreset {
  return GRAPHICS_PRESETS[id];
}
