// Google Photorealistic 3D Tiles session.
//
// The stock GoogleCloudAuth.fetch parses every body as tileset JSON while
// the session is still unknown. A .glb starts with "glTF", that parse throws,
// and later child URLs go out with the key and no session. Google answers 400.
//
// This fetch only reads JSON from tileset URLs, resolves root-relative and
// page-origin /v1/3dtiles paths against tile.googleapis.com, and puts the
// session on every child request. The token is remembered for the key so a
// new plugin (a teleport remounts the tiles renderer) does not start over.

const TILE_ORIGIN = "https://tile.googleapis.com";
const ROOT_URL = `${TILE_ORIGIN}/v1/3dtiles/root.json`;

const sessions = new Map<string, string>();

export function clearTileSessions(): void {
  sessions.clear();
}

export function knownTileSession(apiToken: string): string | null {
  return sessions.get(apiToken) ?? null;
}

function uriSession(uri: string): string | null {
  const query = uri.split("?")[1]?.split("#")[0] ?? "";
  const session = new URLSearchParams(query).get("session");
  return session || null;
}

function collectUris(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectUris(item, out);
    return;
  }
  const rec = node as Record<string, unknown>;
  if (typeof rec.uri === "string") out.push(rec.uri);
  for (const value of Object.values(rec)) collectUris(value, out);
}

/** First `session` query on any content URI. A URI without one does not stop the walk. */
export function sessionFromTileset(json: unknown): string | null {
  const uris: string[] = [];
  collectUris(json, uris);
  for (const uri of uris) {
    const session = uriSession(uri);
    if (session) return session;
  }
  return null;
}

export function isTilesetUrl(url: string): boolean {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  return path.endsWith(".json");
}

/**
 * Absolute tile.googleapis.com URL with the key, and the session when we have one.
 * Root-relative paths and the same path on any other host are rewritten onto the tile host.
 */
export function tileRequestUrl(raw: string, apiToken: string, session: string | null): string {
  const absolute = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(raw, TILE_ORIGIN);
  const onTiles = absolute.hostname === "tile.googleapis.com" || absolute.pathname.startsWith("/v1/3dtiles");
  const url = onTiles && absolute.hostname !== "tile.googleapis.com"
    ? new URL(`${absolute.pathname}${absolute.search}`, TILE_ORIGIN)
    : absolute;
  url.searchParams.set("key", apiToken);
  if (session) url.searchParams.set("session", session);
  return url.href;
}

export function createTileAuth(options: {
  apiToken: string;
  autoRefreshToken?: boolean;
  fetchImpl?: typeof fetch;
}): { fetch: (url: string, init?: RequestInit) => Promise<Response> } {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let session = sessions.get(options.apiToken) ?? null;
  let learning: Promise<void> | null = null;

  const remember = (value: string | null) => {
    if (!value) return;
    session = value;
    sessions.set(options.apiToken, value);
  };

  const learn = async (res: Response) => {
    if (!res.ok) return;
    try {
      remember(sessionFromTileset(await res.clone().json()));
    } catch {
      /* a tileset URL that was not JSON */
    }
  };

  const pullRoot = () => {
    if (session) return Promise.resolve();
    if (learning) return learning;
    const root = tileRequestUrl(ROOT_URL, options.apiToken, null);
    // The caller's abort signal belongs to one tile. The root fetch must outlive it.
    learning = fetchImpl(root)
      .then((res) => learn(res))
      .finally(() => { learning = null; });
    return learning;
  };

  return {
    async fetch(raw: string, init?: RequestInit) {
      const rootCall = raw.includes("root.json");
      if (!session && !rootCall) await pullRoot();
      let href = tileRequestUrl(raw, options.apiToken, session);
      let res = await fetchImpl(href, init);
      if (isTilesetUrl(href)) await learn(res);
      const failed = res.status >= 400 && res.status <= 499;
      if (options.autoRefreshToken && failed && !rootCall) {
        session = null;
        sessions.delete(options.apiToken);
        await pullRoot();
        if (session) {
          href = tileRequestUrl(raw, options.apiToken, session);
          res = await fetchImpl(href, init);
          if (isTilesetUrl(href)) await learn(res);
        }
      }
      return res;
    },
  };
}
