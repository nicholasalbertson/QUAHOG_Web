/**
 * §9.4.1 Deferred music loading (no boot block).
 */

export type MusicLoadState = "idle" | "loading" | "ready" | "error";

export interface DeferredMusic {
  state: MusicLoadState;
  trackId: string | null;
  error: string | null;
}

export function createDeferredMusic(): DeferredMusic {
  return { state: "idle", trackId: null, error: null };
}

/** Kick off async load; resolves without blocking boot. */
export async function loadMusicDeferred(
  m: DeferredMusic,
  trackId: string,
  loader: (id: string) => Promise<void> = async () => undefined,
): Promise<void> {
  m.state = "loading";
  m.trackId = trackId;
  m.error = null;
  try {
    await loader(trackId);
    m.state = "ready";
  } catch (e) {
    m.state = "error";
    m.error = e instanceof Error ? e.message : String(e);
  }
}
