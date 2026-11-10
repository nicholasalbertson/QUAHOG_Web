// How many instances to keep as the camera leaves a cluster.
// 0 is the near band (everything). Higher bands drop the tail.

export function lodCount(total: number, distance: number): number {
  if (total <= 0 || !Number.isFinite(distance)) return 0;
  if (distance < 80) return total;
  if (distance < 180) return Math.max(1, Math.ceil(total / 2));
  return Math.max(1, Math.min(12, Math.ceil(total / 6)));
}
