/**
 * §14.2.4 Export to MissionDef with stable ids.
 */

import { defineMission, type MissionDef } from "./MissionAuthoring";
import type { EditorMission } from "./MissionEditorValidate";

export function exportMissionDef(m: EditorMission): { ok: boolean; def?: MissionDef; errors: string[] } {
  const result = defineMission({
    id: m.id,
    title: m.id,
    steps: m.steps.map((s) => ({
      id: s.id,
      objective: s.objective,
    })),
  });
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, def: result.def, errors: [] };
}
