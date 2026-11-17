// What the app-shell service worker is allowed to store.
// Google Photorealistic 3D Tiles are never cached. A key file is never cached.

export function isGoogleTileRequest(raw: string): boolean {
  let url: URL;
  try { url = new URL(raw); } catch { return false; }
  const host = url.hostname.toLowerCase();
  if (host === "tile.googleapis.com" || host.endsWith(".tile.googleapis.com")) return true;
  if (host === "maps.googleapis.com" || host.endsWith(".googleapis.com")) return true;
  if (host.endsWith(".google.com") && host.includes("khms")) return true;
  if (url.pathname.includes("/v1/3dtiles")) return true;
  return false;
}

/** Same-origin boot files. Slices, keys, models, and tile hosts stay out. */
export function isAppShellRequest(raw: string, origin: string): boolean {
  if (isGoogleTileRequest(raw)) return false;
  let url: URL;
  try { url = new URL(raw); } catch { return false; }
  if (url.origin !== origin) return false;
  const path = url.pathname.toLowerCase();
  if (path.includes("tiles-key")) return false;
  if (/slice-.*\.json$/.test(path)) return false;
  if (path.endsWith(".glb") || path.endsWith(".hdr") || path.endsWith(".wasm")) return false;
  return /\.(js|css|html|webmanifest|png|svg|woff2)$/.test(path)
    || path.endsWith("/")
    || path.endsWith("/index.html")
    || path.endsWith("/earth.html");
}
