/**
 * §14.2.1 Mission editor model — objectives, triggers, spawns, markers.
 */

import type { Trigger } from "./Triggers";

export interface MissionEditorState {
  id: string;
  title: string;
  objectives: { id: string; text: string }[];
  triggers: Trigger[];
  spawns: { id: string; x: number; z: number }[];
  markers: { id: string; x: number; z: number; label?: string }[];
  previewStep: number;
}

export function createMissionEditor(id = "draft"): MissionEditorState {
  return { id, title: "Draft", objectives: [], triggers: [], spawns: [], markers: [], previewStep: 0 };
}

export function bootPreviewAt(s: MissionEditorState, step: number): MissionEditorState {
  return { ...s, previewStep: Math.max(0, Math.min(step, Math.max(0, s.objectives.length - 1))) };
}
