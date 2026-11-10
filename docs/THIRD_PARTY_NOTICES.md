# Third-party notices

Draft for the two Narrows builds (`earth.html` and `index.html`). This is a record of packs the game is allowed to ship, not a substitute for the asset audit. Music is not in this list and is not in the repo.

Commercial use and redistribution are allowed for every pack below. Confirm the file you fetched is the one named here before a store submission.

## Packs the fetch script downloads

Run `npm run assets:fetch-licensed`. Files land in `public/vendor/cc0/files/` and are gitignored. The catalog is `src/content/licensedPacks.json`.

| Pack | Author | License | Used for |
|---|---|---|---|
| Universal Base Characters (rigged human, idle/walk/run) | Quaternius | CC0 1.0 | Pedestrians, the station officer, story guides, and the in-world Borden cast on both builds. Source: https://quaternius.com/packs/universalbasecharacters.html — the file is the public CC0 copy at https://github.com/UMRAM-Bilkent/supine-human-model |
| Kloofendal 48d Partly Cloudy (Pure Sky), 1K HDR | Poly Haven | CC0 1.0 | Image-based light for local meshes. Source: https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |

The human is one CC0 rig. Each slot tints the clothing so a crowd is not a row of clones. The file’s armature is about 5.3 m tall, so the game bakes the idle and walk poses down to 1.75 m. Baking also keeps the mesh rigid: GPU skinning breaks at the tiles build’s earth-centered coordinates, and the street build uses the same poses so the two crowds match. Kenney’s car kit is the traffic and patrol body on both builds. It is a low-poly CC0 kit, not a photograph of a car.

## Packs already in the repo

| Pack | Author | License | Used for |
|---|---|---|---|
| Car Kit, City Kit, Nature Kit, Furniture Kit, and the other Kenney packs under `public/vendor/kenney/` | Kenney | CC0 1.0 | Traffic and the patrol car on both builds. Street props and trees. Catalog ids `kenney-sedan`, `kenney-suv`, `kenney-van`, `kenney-police`, `kenney-tree`, `kenney-trashcan`. https://kenney.nl/assets |
| PBR textures under `public/vendor/polyhaven/` | Poly Haven | CC0 1.0 | Asphalt, cobble, brick, wood, sand, metal. https://polyhaven.com |
| CesiumMan | Cesium | CC-BY 4.0 | Legacy character file kept in `public/models/`. Attribution: CesiumMan © Cesium. |
| OpenStreetMap slices | OpenStreetMap contributors | ODbL 1.0 | Roads and districts. © OpenStreetMap contributors. |
| Google Photorealistic 3D Tiles | Google | Map Tiles API terms | The `earth.html` buildings and ground. Not cached by this project. Not redistributed. |

## Original to this project

Franklin, the Borden menu previews, and the Mount Hope pack models are original project files. They are not third-party downloads. The in-world Borden bodies use the Quaternius cast when that file is present.

## Not included

No music files. No Mixamo files. No asset whose license forbids commercial use or redistribution.
