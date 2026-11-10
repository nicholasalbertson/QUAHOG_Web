// How earth.html obtains a Photorealistic 3D Tiles browser key.
// The key is a Google browser key (HTTP referrer + Map Tiles API restrictions).
// It has to reach the page, because the tiles renderer calls tile.googleapis.com
// from the browser. It must never be committed. See ENV.md.
//
// Order, first match wins:
//   1. ?key=          dev override for this tab (sessionStorage). Scrubbed from the URL.
//   2. VITE_*         baked at build time — the path an rsync of dist/ can use.
//   3. /api/tiles-key Vercel function (GOOGLE_MAP_TILES_KEY, else GOOGLE_MAPS_API_KEY).
//   4. ./tiles-key.json  a gitignored file beside earth.html (rsync, no rebuild).
//   5. localStorage   the paste box, this browser only, when nothing else is configured.

export type TilesKeySource = "dev" | "build" | "api" | "file" | "local";

const ORDER: TilesKeySource[] = ["dev", "build", "api", "file", "local"];
const KEY_RE = /^[A-Za-z0-9_-]{20,256}$/;

/** A Google browser key, or null. Rejects blanks, HTML, and anything with a URL or space. */
export function normalizeTilesKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim();
  return KEY_RE.test(key) ? key : null;
}

export function pickTilesKey(
  sources: Partial<Record<TilesKeySource, string | null | undefined>>,
): { key: string; source: TilesKeySource } | null {
  for (const source of ORDER) {
    const key = normalizeTilesKey(sources[source]);
    if (key) return { key, source };
  }
  return null;
}

/** Server env. GOOGLE_MAP_TILES_KEY wins. GOOGLE_MAPS_API_KEY is only a fallback. */
export function tilesKeyFromEnv(env: Record<string, string | undefined>): string | null {
  return normalizeTilesKey(env.GOOGLE_MAP_TILES_KEY) || normalizeTilesKey(env.GOOGLE_MAPS_API_KEY);
}

export function parseTilesKeyPayload(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  return normalizeTilesKey((body as { key?: unknown }).key);
}

export const DEV_TILES_KEY = "mh.tilesKeyDev";

/** Read ?key=, remember it for this tab, and remove it from the address bar. Never touches localStorage. */
export function takeDevOverride(): string | null {
  const loc = globalThis.window?.location;
  if (!loc) return null;
  const params = new URLSearchParams(loc.search);
  const fromUrl = normalizeTilesKey(params.get("key"));
  if (fromUrl) {
    try { globalThis.sessionStorage?.setItem(DEV_TILES_KEY, fromUrl); } catch { /* private mode */ }
    params.delete("key");
    const q = params.toString();
    const next = loc.pathname + (q ? `?${q}` : "") + loc.hash;
    try { globalThis.window?.history?.replaceState(null, "", next); } catch { /* no-op */ }
    return fromUrl;
  }
  try { return normalizeTilesKey(globalThis.sessionStorage?.getItem(DEV_TILES_KEY)); } catch { return null; }
}

/** GET a JSON `{key}` document. Non-JSON responses (SPA HTML fallbacks) are ignored. */
export async function fetchTilesKey(url: string, fetchImpl: typeof fetch = fetch, timeoutMs = 4000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { credentials: "same-origin", cache: "no-store", signal: ctrl.signal });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.toLowerCase().includes("json")) return null;
    return parseTilesKeyPayload(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
