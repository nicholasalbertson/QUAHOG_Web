// App shell only. Google Photorealistic 3D Tiles are never stored.
// tile.googleapis.com, any googleapis host, and /v1/3dtiles bypass this worker.

const SHELL = "narrows-shell-v1";

function isGoogleTile(url) {
  const host = url.hostname.toLowerCase();
  if (host === "tile.googleapis.com" || host.endsWith(".tile.googleapis.com")) return true;
  if (host.endsWith(".googleapis.com")) return true;
  if (host.endsWith(".google.com") && host.includes("khms")) return true;
  if (url.pathname.includes("/v1/3dtiles")) return true;
  return false;
}

function isShell(url) {
  if (isGoogleTile(url)) return false;
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname.toLowerCase();
  if (path.includes("tiles-key")) return false;
  if (/slice-.*\.json$/.test(path)) return false;
  if (path.endsWith(".glb") || path.endsWith(".hdr") || path.endsWith(".wasm")) return false;
  return /\.(js|css|html|webmanifest|png|svg|woff2)$/.test(path) || path.endsWith("/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(["./", "./index.html", "./earth.html", "./manifest.webmanifest"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (isGoogleTile(url)) return;
  if (!isShell(url)) return;
  event.respondWith(
    fetch(event.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(SHELL).then((cache) => cache.put(event.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(event.request).then((hit) => hit || fetch(event.request))),
  );
});
