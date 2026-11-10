import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEV_TILES_KEY,
  fetchTilesKey,
  normalizeTilesKey,
  parseTilesKeyPayload,
  pickTilesKey,
  takeDevOverride,
  tilesKeyFromEnv,
} from "./tilesKey";

const SAMPLE = "AIzaSyABCDEFGHIJKLMNOPQRSTUV";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tiles key selection", () => {
  it("accepts a browser key and rejects blanks, markup, and short strings", () => {
    expect(normalizeTilesKey(`  ${SAMPLE}  `)).toBe(SAMPLE);
    expect(normalizeTilesKey("")).toBeNull();
    expect(normalizeTilesKey("short")).toBeNull();
    expect(normalizeTilesKey(`${SAMPLE}<script>`)).toBeNull();
    expect(normalizeTilesKey(`https://example.com/?key=${SAMPLE}`)).toBeNull();
    expect(parseTilesKeyPayload({ key: SAMPLE })).toBe(SAMPLE);
    expect(parseTilesKeyPayload({ key: "nope" })).toBeNull();
    expect(parseTilesKeyPayload(null)).toBeNull();
    expect(parseTilesKeyPayload("")).toBeNull();
  });

  it("prefers the dev override, then the build, the function, the file, then a pasted key", () => {
    expect(pickTilesKey({
      dev: SAMPLE,
      build: "AIzaBuildKeyXXXXXXXXXXXX",
      api: "AIzaApiKeyXXXXXXXXXXXXXX",
      file: "AIzaFileKeyXXXXXXXXXXXXX",
      local: "AIzaLocalKeyXXXXXXXXXXXX",
    })).toEqual({ key: SAMPLE, source: "dev" });
    expect(pickTilesKey({
      build: "",
      api: "AIzaApiKeyXXXXXXXXXXXXXX",
      local: "AIzaLocalKeyXXXXXXXXXXXX",
    })).toEqual({ key: "AIzaApiKeyXXXXXXXXXXXXXX", source: "api" });
    expect(pickTilesKey({ file: "not a key", local: "AIzaLocalKeyXXXXXXXXXXXX" })).toEqual({
      key: "AIzaLocalKeyXXXXXXXXXXXX",
      source: "local",
    });
    expect(pickTilesKey({})).toBeNull();
  });

  it("reads GOOGLE_MAP_TILES_KEY and falls back to GOOGLE_MAPS_API_KEY", () => {
    const tiles = "AIzaTilesKeyXXXXXXXXXXXXX";
    const maps = "AIzaMapsKeyXXXXXXXXXXXXXX";
    expect(tilesKeyFromEnv({ GOOGLE_MAP_TILES_KEY: tiles, GOOGLE_MAPS_API_KEY: maps })).toBe(tiles);
    expect(tilesKeyFromEnv({ GOOGLE_MAP_TILES_KEY: "  ", GOOGLE_MAPS_API_KEY: maps })).toBe(maps);
    expect(tilesKeyFromEnv({ GOOGLE_MAPS_API_KEY: "has spaces and junk" })).toBeNull();
    expect(tilesKeyFromEnv({})).toBeNull();
  });

  it("keeps a ?key= override in this tab and removes it from the address bar", () => {
    const session = new Map<string, string>();
    const local = new Map<string, string>();
    let href = "";
    vi.stubGlobal("window", {
      location: { search: `?atlas=1&key=${SAMPLE}`, pathname: "/earth.html", hash: "#play" },
      history: { replaceState: (_s: unknown, _t: string, url: string) => { href = url; } },
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => session.get(k) ?? null,
      setItem: (k: string, v: string) => session.set(k, v),
    });
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => local.get(k) ?? null,
      setItem: (k: string, v: string) => local.set(k, v),
    });
    expect(takeDevOverride()).toBe(SAMPLE);
    expect(href).toBe("/earth.html?atlas=1#play");
    expect(session.get(DEV_TILES_KEY)).toBe(SAMPLE);
    expect(local.size).toBe(0);
    vi.stubGlobal("window", {
      location: { search: "", pathname: "/earth.html", hash: "" },
      history: { replaceState: () => {} },
    });
    expect(takeDevOverride()).toBe(SAMPLE);
  });

  it("ignores a non-JSON 200 and a missing endpoint", async () => {
    const html = vi.fn(async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }));
    expect(await fetchTilesKey("/api/tiles-key", html as unknown as typeof fetch)).toBeNull();
    const missing = vi.fn(async () => new Response("{}", { status: 404, headers: { "content-type": "application/json" } }));
    expect(await fetchTilesKey("./tiles-key.json", missing as unknown as typeof fetch)).toBeNull();
    const ok = vi.fn(async () => new Response(JSON.stringify({ key: SAMPLE }), { status: 200, headers: { "content-type": "application/json" } }));
    expect(await fetchTilesKey("/api/tiles-key", ok as unknown as typeof fetch)).toBe(SAMPLE);
  });
});
