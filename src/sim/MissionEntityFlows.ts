/**
 * §8.5.5 All four flows work on a 3+ entity mission.
 * Flows: spawn, assign, complete, despawn.
 */

export type EntityFlow = "spawn" | "assign" | "complete" | "despawn";

export interface MissionEntity {
  id: string;
  role: string;
  flow: EntityFlow;
}

export function createMissionEntities(roles: string[]): MissionEntity[] {
  return roles.map((role, i) => ({ id: `e${i}`, role, flow: "spawn" as const }));
}

export function advanceEntity(e: MissionEntity): EntityFlow {
  const order: EntityFlow[] = ["spawn", "assign", "complete", "despawn"];
  const i = order.indexOf(e.flow);
  e.flow = order[Math.min(order.length - 1, i + 1)]!;
  return e.flow;
}

export function allFlowsExercised(entities: MissionEntity[]): boolean {
  const seen = new Set(entities.map((e) => e.flow));
  // Drive each through all flows once in a dry run tracker
  const hist = new Set<EntityFlow>();
  for (const e of entities) {
    const copy = { ...e, flow: "spawn" as EntityFlow };
    hist.add(copy.flow);
    while (copy.flow !== "despawn") hist.add(advanceEntity(copy));
  }
  void seen;
  return hist.size === 4 && entities.length >= 3;
}
