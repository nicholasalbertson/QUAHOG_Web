import { guard } from "./_guard";
import type { ApiHandler } from "./_http";
import { tilesKeyFromEnv } from "../src/earth/tilesKey";

// Hands the Photorealistic 3D Tiles browser key to a same-origin page.
// The tiles renderer has to call tile.googleapis.com from the browser, so the
// key cannot stay server-side the way the Static Maps signing secret does.
// Protection is the key restriction (HTTP referrer + Map Tiles API only) plus
// the same-origin guard. Never log the key. See ENV.md.
//
// Vercel → Project → Settings → Environment Variables:
//   GOOGLE_MAP_TILES_KEY   (preferred)
//   GOOGLE_MAPS_API_KEY    (fallback only — must itself be a browser key)

const handler: ApiHandler = async (req, res) => {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Cache-Control", "private, no-store");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!guard(req, res, 30)) return;
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const key = tilesKeyFromEnv(process.env);
  if (!key) {
    res.status(404).json({ error: "tiles_key_unconfigured" });
    return;
  }
  if (req.method === "HEAD") {
    res.status(204).send("");
    return;
  }
  res.status(200).json({ key });
};

export default handler;
