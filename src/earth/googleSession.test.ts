import { afterEach, describe, expect, it } from "vitest";
import { clearTileSessions, createTileAuth, sessionFromTileset, tileRequestUrl } from "./googleSession";

const ROOT = {
  root: {
    children: [
      { content: { uri: "/v1/3dtiles/datasets/abc/files/first.json" } },
      { content: { uri: "https://tile.googleapis.com/v1/3dtiles/datasets/abc/files/second.json?session=sess-1" } },
    ],
  },
};

afterEach(() => clearTileSessions());

describe("tile session", () => {
  it("reads the session from a later content URI when the first one has none", () => {
    expect(sessionFromTileset(ROOT)).toBe("sess-1");
    expect(sessionFromTileset({ root: { content: { uri: "/v1/3dtiles/no-session.json" } } })).toBeNull();
  });

  it("puts the tile host, the key, and the session on a root-relative path", () => {
    const href = tileRequestUrl("/v1/3dtiles/datasets/abc/files/tile.glb", "test-key", "sess-1");
    const url = new URL(href);
    expect(url.origin).toBe("https://tile.googleapis.com");
    expect(url.pathname).toBe("/v1/3dtiles/datasets/abc/files/tile.glb");
    expect(url.searchParams.get("key")).toBe("test-key");
    expect(url.searchParams.get("session")).toBe("sess-1");
  });

  it("rewrites a page-origin tile path onto tile.googleapis.com", () => {
    const href = tileRequestUrl(
      "http://127.0.0.1:4173/v1/3dtiles/datasets/abc/files/tile.glb",
      "test-key",
      "sess-1",
    );
    expect(new URL(href).origin).toBe("https://tile.googleapis.com");
    expect(new URL(href).searchParams.get("session")).toBe("sess-1");
  });

  it("sends every child tile request with the session param and does not parse a glb as json", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const href = String(input);
      calls.push(href);
      if (href.includes("root.json")) {
        return new Response(JSON.stringify(ROOT), { status: 200, headers: { "content-type": "application/json" } });
      }
      const body = new Uint8Array([0x67, 0x6c, 0x54, 0x46]);
      return new Response(body, { status: 200, headers: { "content-type": "model/gltf-binary" } });
    };
    const auth = createTileAuth({ apiToken: "test-key", autoRefreshToken: true, fetchImpl });
    const glb = await auth.fetch("/v1/3dtiles/datasets/abc/files/tile.glb");
    const child = await auth.fetch("http://127.0.0.1:4173/v1/3dtiles/datasets/abc/files/child.json");
    expect(glb).toBeInstanceOf(Response);
    expect(child).toBeInstanceOf(Response);
    const children = calls.filter((href) => !href.includes("root.json"));
    expect(children.length).toBeGreaterThanOrEqual(2);
    for (const href of children) {
      const url = new URL(href);
      expect(url.hostname).toBe("tile.googleapis.com");
      expect(url.searchParams.get("key")).toBe("test-key");
      expect(url.searchParams.get("session")).toBe("sess-1");
    }
    // A second plugin for the same key already knows the session, so a glb is not parsed.
    const again = createTileAuth({
      apiToken: "test-key",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return new Response(new Uint8Array([0x67, 0x6c, 0x54, 0x46]), { status: 200 });
      },
    });
    const direct = await again.fetch("/v1/3dtiles/datasets/abc/files/again.glb");
    expect(direct).toBeInstanceOf(Response);
    expect(new URL(calls[calls.length - 1]).searchParams.get("session")).toBe("sess-1");
    expect(calls.filter((href) => href.includes("root.json")).length).toBe(1);
  });
});
