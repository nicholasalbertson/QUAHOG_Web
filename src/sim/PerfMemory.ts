/**
 * §1.11.5 Memory via performance.memory where available.
 */

export interface MemorySnapshot {
  supported: boolean;
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

interface PerfMemoryLike {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export function readMemory(): MemorySnapshot {
  const perf = typeof performance !== "undefined" ? (performance as Performance & { memory?: PerfMemoryLike }) : undefined;
  const mem = perf?.memory;
  if (!mem) return { supported: false };
  return {
    supported: true,
    usedJSHeapSize: mem.usedJSHeapSize,
    totalJSHeapSize: mem.totalJSHeapSize,
    jsHeapSizeLimit: mem.jsHeapSizeLimit,
  };
}

/** Dev heap-snapshot stub — browsers gate real heap snapshots to DevTools. */
export function requestHeapSnapshotLabel(): string {
  return `heap-${new Date().toISOString()}`;
}
