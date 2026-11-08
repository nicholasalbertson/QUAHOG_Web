/**
 * §14.2.3 Mission editor validation — unreachable / missing / dangling.
 */

export interface EditorMission {
  id: string;
  steps: { id: string; objective: string; markerId?: string; actorId?: string }[];
  markers: { id: string }[];
  actors: { id: string }[];
}

export function validateEditorMission(m: EditorMission): string[] {
  const errs: string[] = [];
  if (!m.id) errs.push("missing mission id");
  if (!m.steps.length) errs.push("no steps");
  const markers = new Set(m.markers.map((x) => x.id));
  const actors = new Set(m.actors.map((x) => x.id));
  for (const s of m.steps) {
    if (!s.id) errs.push("step missing id");
    if (!s.objective) errs.push(`step ${s.id}: empty objective`);
    if (s.markerId && !markers.has(s.markerId)) errs.push(`dangling marker ${s.markerId}`);
    if (s.actorId && !actors.has(s.actorId)) errs.push(`missing actor ${s.actorId}`);
  }
  return errs;
}
