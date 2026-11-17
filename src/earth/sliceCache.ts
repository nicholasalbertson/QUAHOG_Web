import { loadSlice, type Slice } from "../slice";

const cache = new Map<string, Promise<Slice>>();

/** One in-flight (or finished) fetch per slice URL. */
export function loadSliceCached(url: string): Promise<Slice> {
  let pending = cache.get(url);
  if (!pending) {
    pending = loadSlice(url);
    cache.set(url, pending);
    pending.catch(() => {
      if (cache.get(url) === pending) cache.delete(url);
    });
  }
  return pending;
}
