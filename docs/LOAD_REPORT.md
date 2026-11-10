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

## This round

Measured again on `vite preview` after the post stack was split out.

| Page | DOMContentLoaded | Boot transfer | Boot files |
|---|---:|---:|---|
| Street map | 78 ms | 83,630 bytes | entry, preload helper, React, CSS, boot |
| 3D Tiles | boot files only | three.js not in the boot set | entry, preload helper, React, boot, favicon |

The tiles-page clock on that pass read 14 s because the street world was still finishing a 20 MB play download in the same browser. The boot file list did not include three.js, Rapier, or a city slice.

Play on the street map then loaded `vendor-post` (299,873 bytes) and a 1,532 byte effects module, separate from the world chunk. The tiles page loaded `vendor-three` and `vendor-tiles` only after Play. Each city slice is still fetched for the city on screen. Foliage instances drop as the camera leaves the block (`lodCount`). Pack GLBs were already Meshopt. There is no KTX2 encoder in this toolchain, so the PBR JPEGs stay as they are. Google tiles are not transcoded and are not cached.

## Scene budget

The black canvas was the whole scene unmounting, plus meshing every road in a city at once. Counts below are the roads each slice would ribbon before the window, and the roads the high tier actually ribbons around that city's center. Local roads stay inside 900 m (at most 500). Highways stay inside 2,200 m so the interstate ahead of the car still exists, and the rest of the slice is not meshed until the player gets there.

| Slice | Roads before | Roads in the window |
|---|---:|---:|
| New Bedford | 16,167 | 627 |
| Fall River | 1,603 | 608 |
| Brockton | 5,791 | 594 |
| Cape Cod | 4,987 | 577 |
| All four | 28,548 | 2,406 |

Skinned characters are capped at 12 on high, 8 on medium, and 6 on low or on a phone. The previous high crowd was 44. Building meshes, when a slice still carries footprints, stop at 280 inside 700 m on high. Draw calls, triangles, textures, and GPU memory have the same tiers. A frame that stays over the draw or triangle cap for about a second and a half steps quality down.

Slice JSON is parsed in a worker and posted back in chunks of 700. Vegetation and prop packs are not requested while street dressing is off. Texture edges cap at 1024 / 512 / 256 by tier. KTX2 encoding is still not in the toolchain. Meshopt on the pack GLBs is unchanged.

The soak in `src/perf/stability.test.ts` walks every district, drives four steps out from the spawn, and fails if a window exceeds the cap, a sampled frame is black, a lost context would not call `preventDefault`, or the heap figure is over the tier budget. It does not launch a browser.
