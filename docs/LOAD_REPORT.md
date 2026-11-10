# Load report

Measured in Chrome (`/usr/bin/google-chrome-stable`, `--no-sandbox`) on this machine. Transfer size is the navigation entry plus every resource entry (`transferSize`, or `encodedBodySize` when the transfer size is empty). The clock is `DOMContentLoaded`. Nothing was clicked before the boot numbers.

## Before

Taken on the dev server, before the boot screen existed. The title mounted three.js and, on the tiles page, fetched the city slice immediately.

| Page | DOMContentLoaded | Transferred |
|---|---:|---:|
| Street map (`index.html`) | 478 ms | 13.3 MB |
| 3D Tiles (`earth.html`) | 365 ms | 14.2 MB |

The tiles page included `slice-newbedford.json` at 4,320,123 bytes before Play. The production JavaScript, WASM, and CSS on that build totaled about 4.47 MB, and the street entry file alone was 359 KB.

## After

Taken on `vite preview` of this build. The first screen is the shared boot title. three.js, Rapier, and the city slice stay out of that download.

| Page | DOMContentLoaded | Transferred | What arrived |
|---|---:|---:|---|
| Street map | 41 ms | 83,536 bytes | entry 1,260 · preload helper 976 · React 75,053 · CSS 2,875 · boot 2,068 |
| 3D Tiles | 44 ms | 80,603 bytes | entry 1,272 · preload helper 976 · boot 2,068 · React 75,053 · favicon 300 |

No three.js, no Rapier, and no `slice-newbedford.json` in either boot.

Play then asks for the world. Gzip sizes of those chunks:

| Chunk | Gzip |
|---|---:|
| Street world (`App`) | 117 KB |
| Tiles world (`EarthApp`) | 38 KB |
| three.js | 236 KB |
| React Three Fiber and Drei | 95 KB |
| Rapier (street) | 769 KB |
| City slice module | 60 KB |
| 3D Tiles renderer (tiles page) | 37 KB |

On the tiles page, Play with no map key stays on the key notice and does not download the city slice. With a key, the slice and the tiles load after Play.

The fetched packs (Quaternius human 684 KB, Kloofendal HDRI 1.4 MB, Kenney cars) download with the world, after Play. They are not in the boot transfer.
