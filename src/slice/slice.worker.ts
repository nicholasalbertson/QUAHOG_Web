import { chunkSlice, parseSliceText, type SlicePart } from "./parseOffThread";

// Runs off the main thread. Posts the slice in chunks so the receiver can
// apply them across turns instead of cloning the whole city in one go.

self.onmessage = (ev: MessageEvent<{ text?: string }>) => {
  const post = (part: SlicePart) => (self as unknown as Worker).postMessage(part);
  try {
    const slice = parseSliceText(ev.data?.text ?? "");
    for (const part of chunkSlice(slice)) post(part);
  } catch (e) {
    post({ kind: "error", message: e instanceof Error ? e.message : String(e) });
  }
};
