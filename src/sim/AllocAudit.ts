/**
 * §12.3.1 Audit helper — track unexpected allocations in hot paths (dev).
 */

export interface AllocProbe {
  label: string;
  hits: number;
}

const probes = new Map<string, AllocProbe>();

export function allocHit(label: string): void {
  const p = probes.get(label) ?? { label, hits: 0 };
  p.hits++;
  probes.set(label, p);
}

export function allocReport(): AllocProbe[] {
  return [...probes.values()];
}

export function resetAllocAudit(): void {
  probes.clear();
}
