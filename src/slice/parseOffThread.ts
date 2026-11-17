// Slice JSON is multi-megabyte. Parsing it on the main thread stalls the
// frame and is one of the ways the canvas goes black. The worker parses and
// posts roads and buildings in chunks. If the worker cannot start, parsing
// falls back to this thread and still returns a slice instead of throwing
// into the renderer.

import type { Slice } from "../slice";

const CHUNK = 700;

export function parseSliceText(text: string): Slice {
  let slice: Slice;
  try {
    slice = JSON.parse(text) as Slice;
  } catch (e) {
    throw new Error(`slice is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!slice || typeof slice !== "object" || !Array.isArray(slice.buildings) || !Array.isArray(slice.roads)) {
    throw new Error("slice is missing required fields (buildings/roads)");
  }
  return slice;
}

export interface SliceAcc {
  roads: Slice["roads"];
  buildings: Slice["buildings"];
  rest: Partial<Slice> | null;
}

export function emptySliceAcc(): SliceAcc {
  return { roads: [], buildings: [], rest: null };
}

export type SlicePart =
  | { kind: "roads"; items: Slice["roads"] }
  | { kind: "buildings"; items: Slice["buildings"] }
  | { kind: "done"; rest: Partial<Slice> }
  | { kind: "error"; message: string };

/** Apply one worker message. Returns the slice once the done part arrives. */
export function applySlicePart(acc: SliceAcc, part: SlicePart): Slice | null {
  if (part.kind === "error") throw new Error(part.message);
  if (part.kind === "roads") { acc.roads.push(...part.items); return null; }
  if (part.kind === "buildings") { acc.buildings.push(...part.items); return null; }
  return { ...(part.rest as Slice), roads: acc.roads, buildings: acc.buildings };
}

export function chunkSlice(slice: Slice): SlicePart[] {
  const parts: SlicePart[] = [];
  for (let i = 0; i < slice.roads.length; i += CHUNK) {
    parts.push({ kind: "roads", items: slice.roads.slice(i, i + CHUNK) });
  }
  for (let i = 0; i < slice.buildings.length; i += CHUNK) {
    parts.push({ kind: "buildings", items: slice.buildings.slice(i, i + CHUNK) });
  }
  const rest = { ...slice, roads: [], buildings: [] };
  parts.push({ kind: "done", rest });
  return parts;
}

export function parseSliceOffThread(text: string): Promise<Slice> {
  if (typeof Worker === "undefined") return Promise.resolve().then(() => parseSliceText(text));
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./slice.worker.ts", import.meta.url), { type: "module" });
    } catch {
      try { resolve(parseSliceText(text)); } catch (e) { reject(e); }
      return;
    }
    const acc = emptySliceAcc();
    const finish = (err?: unknown) => {
      clearTimeout(timer);
      worker.terminate();
      if (!err) return;
      try { resolve(parseSliceText(text)); } catch (e) { reject(e); }
    };
    const timer = setTimeout(() => finish(new Error("slice worker timed out")), 20000);
    worker.onmessage = (ev: MessageEvent<SlicePart>) => {
      try {
        const slice = applySlicePart(acc, ev.data);
        if (!slice) return;
        clearTimeout(timer);
        worker.terminate();
        resolve(slice);
      } catch (e) {
        finish(e);
      }
    };
    worker.onerror = () => finish(new Error("slice worker failed"));
    worker.postMessage({ text });
  });
}
