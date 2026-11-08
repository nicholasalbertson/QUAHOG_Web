/**
 * §2.1.3 maxDepth on recursive traversals — guard + optional bail.
 */

export class DepthGuard {
  readonly max: number;
  depth = 0;

  constructor(max = 32) {
    this.max = Math.max(1, max);
  }

  enter(): boolean {
    if (this.depth >= this.max) return false;
    this.depth++;
    return true;
  }

  leave(): void {
    this.depth = Math.max(0, this.depth - 1);
  }

  withDepth<T>(fn: () => T, fallback: T): T {
    if (!this.enter()) return fallback;
    try {
      return fn();
    } finally {
      this.leave();
    }
  }
}

/** Walk a tree with maxDepth; visitor returns children. */
export function walkLimited<T>(
  root: T,
  childrenOf: (n: T) => readonly T[],
  visit: (n: T, depth: number) => void,
  maxDepth = 32,
): number {
  let visited = 0;
  const stack: { n: T; d: number }[] = [{ n: root, d: 0 }];
  while (stack.length) {
    const { n, d } = stack.pop()!;
    visit(n, d);
    visited++;
    if (d + 1 >= maxDepth) continue;
    const kids = childrenOf(n);
    for (let i = kids.length - 1; i >= 0; i--) stack.push({ n: kids[i]!, d: d + 1 });
  }
  return visited;
}
