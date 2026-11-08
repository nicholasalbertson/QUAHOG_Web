/**
 * §14.1.1 Road/PedGraph visualizer → SVG string.
 */

export function graphToSvg(
  nodes: { id: number | string; x: number; z: number }[],
  edges: { from: number | string; to: number | string }[],
  width = 640,
  height = 480,
): string {
  if (nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`;
  }
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minZ = Math.min(minZ, n.z);
    maxZ = Math.max(maxZ, n.z);
  }
  const pad = 16;
  const sx = (x: number) => pad + ((x - minX) / Math.max(1e-3, maxX - minX)) * (width - pad * 2);
  const sy = (z: number) => pad + ((z - minZ) / Math.max(1e-3, maxZ - minZ)) * (height - pad * 2);
  const byId = new Map(nodes.map((n) => [String(n.id), n]));
  const lines: string[] = [];
  for (const e of edges) {
    const a = byId.get(String(e.from));
    const b = byId.get(String(e.to));
    if (!a || !b) continue;
    lines.push(`<line x1="${sx(a.x)}" y1="${sy(a.z)}" x2="${sx(b.x)}" y2="${sy(b.z)}" stroke="#8af" stroke-width="1"/>`);
  }
  for (const n of nodes) {
    lines.push(`<circle cx="${sx(n.x)}" cy="${sy(n.z)}" r="2.5" fill="#caa24a"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#142b35">${lines.join("")}</svg>`;
}

export function orphanReport(nodes: { id: number | string }[], edges: { from: number | string; to: number | string }[]): (number | string)[] {
  const deg = new Map<string, number>();
  for (const n of nodes) deg.set(String(n.id), 0);
  for (const e of edges) {
    deg.set(String(e.from), (deg.get(String(e.from)) ?? 0) + 1);
    deg.set(String(e.to), (deg.get(String(e.to)) ?? 0) + 1);
  }
  return nodes.filter((n) => (deg.get(String(n.id)) ?? 0) === 0).map((n) => n.id);
}
