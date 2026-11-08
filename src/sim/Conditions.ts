/**
 * §1.3.20–23 Condition trees — leaf predicates with all/any/not combinators.
 */

export type PredicateId = string;

export type ConditionNode =
  | { op: "leaf"; id: PredicateId; args?: unknown[] }
  | { op: "all"; kids: ConditionNode[] }
  | { op: "any"; kids: ConditionNode[] }
  | { op: "not"; kid: ConditionNode };

export type PredicateFn = (args: unknown[] | undefined, ctx: ConditionCtx) => boolean;

export interface ConditionCtx {
  flags?: Record<string, boolean>;
  inventory?: Record<string, number>;
  hp?: number;
  police?: number;
  distanceTo?: (x: number, z: number) => number;
}

const DEFAULT_LEAVES: Record<string, PredicateFn> = {
  "flag.is"(args, ctx) {
    const key = String(args?.[0] ?? "");
    return !!ctx.flags?.[key];
  },
  "inventory.has"(args, ctx) {
    const key = String(args?.[0] ?? "");
    const need = Number(args?.[1] ?? 1);
    return (ctx.inventory?.[key] ?? 0) >= need;
  },
  "actor.hpBelow"(args, ctx) {
    return (ctx.hp ?? 100) < Number(args?.[0] ?? 50);
  },
  "wanted.atLeast"(args, ctx) {
    return (ctx.police ?? 0) >= Number(args?.[0] ?? 1);
  },
};

export function countNodes(n: ConditionNode): number {
  if (n.op === "leaf") return 1;
  if (n.op === "not") return 1 + countNodes(n.kid);
  return 1 + n.kids.reduce((s, k) => s + countNodes(k), 0);
}

/** §1.3.22 Validation — unknown predicate / empty combinators. */
export function validateCondition(
  n: ConditionNode,
  leaves: Record<string, PredicateFn> = DEFAULT_LEAVES,
): string[] {
  const errs: string[] = [];
  const walk = (node: ConditionNode, path: string) => {
    if (node.op === "leaf") {
      if (!leaves[node.id]) errs.push(`${path}: unknown predicate ${node.id}`);
      return;
    }
    if (node.op === "not") {
      walk(node.kid, path + "/not");
      return;
    }
    if (!node.kids.length) errs.push(`${path}: empty ${node.op}`);
    node.kids.forEach((k, i) => walk(k, `${path}/${node.op}[${i}]`));
  };
  walk(n, "root");
  return errs;
}

/** Evaluate; §1.3.23 warns when tree > 100 nodes. */
export function evalCondition(
  n: ConditionNode,
  ctx: ConditionCtx,
  leaves: Record<string, PredicateFn> = DEFAULT_LEAVES,
): boolean {
  const size = countNodes(n);
  if (size > 100) console.warn(`[Conditions] tree size ${size} > 100`);
  const walk = (node: ConditionNode): boolean => {
    if (node.op === "leaf") {
      const fn = leaves[node.id];
      if (!fn) return false;
      return fn(node.args, ctx);
    }
    if (node.op === "not") return !walk(node.kid);
    if (node.op === "all") return node.kids.every(walk);
    return node.kids.some(walk);
  };
  return walk(n);
}

export function serializeCondition(n: ConditionNode): string {
  return JSON.stringify(n);
}

export function deserializeCondition(raw: string): ConditionNode {
  return JSON.parse(raw) as ConditionNode;
}

export { DEFAULT_LEAVES };
