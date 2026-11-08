/**
 * §7.1.1 GPU mesh dispose on unmount — helper for Three.js object graphs.
 */

export interface DisposableLike {
  geometry?: { dispose(): void } | null;
  material?: { dispose(): void } | { dispose(): void }[] | null;
  children?: DisposableLike[];
}

export function disposeObject3D(root: DisposableLike): number {
  let n = 0;
  const stack: DisposableLike[] = [root];
  while (stack.length) {
    const o = stack.pop()!;
    if (o.geometry) {
      o.geometry.dispose();
      n++;
    }
    const mat = o.material;
    if (Array.isArray(mat)) {
      for (const m of mat) {
        m.dispose();
        n++;
      }
    } else if (mat) {
      mat.dispose();
      n++;
    }
    if (o.children) for (const c of o.children) stack.push(c);
  }
  return n;
}
