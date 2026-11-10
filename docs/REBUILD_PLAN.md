# The Narrows — rebuild plan

**Working title: The Narrows.** The repo, the production host, and older docs still say Quahog or Mount Hope. Those names stay until a deliberate rename. This document is the product plan for the photoreal rebuild. Phase 1 lands with it.

The Narrows is the real gorge of the Quequechan River at the Fall River waterfront, under the Braga Bridge and beside Battleship Cove. The game is an open-world urban exploration and driving game on that coast: Fall River, New Bedford, Brockton, Cape Cod, the towns between them, and the highways that tie them together.

Photoreal Google 3D Tiles (`earth.html`) is the chosen world. The stylized OSM blockout (`index.html`) stays playable. Production deploys stay manual. Music never enters the repo.

## Status

Phase 1 is in. Phase 2 and the first playable loop are in on the same branch:

- The local frame rebases under the car at about 1.8 km, and a second camera asks the tiles to stream ahead of the velocity. I-195, Route 24, US 6, and Route 25/28 are drives, not teleports. Teleport still exists.
- Spawns outside New Bedford snap to the nearest drivable centerline. The pose save stores the live anchor, so a resume on the highway does not drop you back at the city pin.
- Each city gets a small crowd (8 people, 4 cars) on that city's roads. The crowd shifts with the frame. It is not the old 50-ped New Bedford crowd copied four times.
- Headlights, tail lights, and a handful of streetlights follow the sim hour. The hour runs, and the pause menu can set it.
- An opening arc on foot at the Narrows, then Battleship Cove, then I-195 into New Bedford. After that, the existing campaign uses targets converted into the live frame, including the Brockton and Cape beats.
- Hitting someone raises police stars. One or two cruisers chase. Stars decay. A bust takes a cut of cash.
- Fronts from the shared economy can be bought from the pause menu. Income still ticks.
- Title screen, pause, settings (volume, hour, weather), and control rebinding through the shared key map. Procedural SFX (engine, horn, crash, punch, siren, cash, footsteps, harbor bed). No music files.
- Players open `earth.html` with no `?key=`. Vercel serves the browser key from `GOOGLE_MAP_TILES_KEY` (`/api/tiles-key`). An rsync of `dist/` uses a build-time `VITE_GOOGLE_MAP_TILES_KEY` or a gitignored `tiles-key.json`. A missing, refused (401/403, or 400 when Google says the key is invalid), or over-quota (429) key shows an overlay. How to create and restrict the key is in `ENV.md`. `?key=` is a one-tab developer override.
- The frame rebase no longer rebuilds a whole city road list in one frame. Routes fill a few dozen roads at a time. Quality steps between high, medium, and low from frame time and the JS heap, unless the player locks a tier. F3 toggles a performance line. `docs/SOAK_TEST.md` is the hardware pass.
- Traffic stays on the scanned roads, yields at a join, and turns around when a road ends. At three stars one cruiser parks across the lane ahead. Hard hits spend body and engine; holding R while stopped pays to repair. The wind and wave bed retunes for mill, harbor, city, highway, and cape. No new audio files.
- Pause → Jobs has one chain each for Fall River, New Bedford, Brockton, Cape Cod, and the South Coast towns. They use latitude and longitude, so a rebase does not move the pin. The shared campaign list is unchanged.
- Gamepad triggers drive the car and Start pauses. Settings cover graphics, subtitle size, and a colorblind HUD. A loading card, a credits screen (OpenStreetMap, Google, pack models), and a redacted crash overlay are in. `docs/RELEASE_CHECKLIST.md` is the human list.

Still not a commercial release. The checklist is the remaining human work: the live key and its terms, pack licenses, art, voice, rating, privacy, store listing, and the soak on real hardware.

## What phase 1 lands

- The stability pass from `ROADMAP.md` §3, wired through so a hidden tab and a bad key do not take the photoreal build down.
- A region catalog and a spawn/teleport that re-anchors the globe on real places: the Narrows and Battleship Cove, New Bedford, Brockton, Cape Cod, and the surrounding South Coast towns, including pulls on I-195, Route 24, US 6, Route 25, and Route 28.
- A full-screen chart and a heading-up minimap with those place names, the highway network, and the active city's OSM streets.
- A driving model with coast, a service brake, a handbrake, speed-sensitive steering, wet grip, and a chase camera that lengthens with speed.
- Resume that remembers which city you were in, and does not write a Cape-local coordinate into the shared New Bedford save.

Phase 1 did not make one continuous drive. The rebase below is now in the photoreal build. Teleport remains for jumping the map.

## Region coverage

| Region | What you can drop into | Roads on the map |
|---|---|---|
| Fall River | The Narrows, Battleship Cove, Lizzie Borden House, Government Center, Kennedy Park, Heritage State Park | `slice-fallriver.json` |
| New Bedford | Seamen's Bethel (slice-aligned, with pedestrians), Whaling Museum, State Pier, Purchase Street, Buttonwood Park, Fort Taber, Clasky Common, the I-195 interchange | `slice-newbedford.json` |
| Brockton | Main Street, Campello, Westgate Mall, Brockton Hospital, Route 24 | `slice-brockton.json` |
| Cape Cod | Hyannis harbor and Main Street, Hyannis Port, Falmouth, Woods Hole, both canal bridges, Sandwich, Barnstable, Mashpee, Orleans, Chatham, Provincetown | `slice-cape.json` |
| South Coast | Fairhaven, Fort Phoenix, Dartmouth, Padanaram, Westport, Acushnet, Somerset, Swansea, Assonet, Taunton, Middleborough, Lakeville, Marion, Mattapoisett, Wareham, Onset, Buzzards Bay | New Bedford slice where the town is inside it; otherwise the highway chart |

The four original earth drop points are unchanged: New Bedford at the slice origin (41.636, −70.9205), Battleship Cove (41.7044, −71.1641), Lizzie Borden House (41.6993, −71.1558), downtown Fall River (41.7015, −71.1547). Brockton Main Street, Hyannis marina, and Hyannis Port match the validated stylized road spawns.

Highways on the chart, west to east or south to north: **I-195** (Swansea through the Braga Bridge, New Bedford, Wareham), **Route 24** (Fall River to Brockton), **US 6** (the south coast and the Cape spine out to Provincetown), **Route 25** (Wareham to the Bourne Bridge), **Route 28** (Bourne, Falmouth, Mashpee, Hyannis, Chatham). The chart is a navigation drawing. It is not a survey of every ramp.

## Streaming and world architecture

Google's tiles live in earth-centered coordinates, about 6.3 million meters from the origin. Float32 cannot skin a character there, which is why the player, the car, and the pedestrians live in a local east-north-up frame (`EastNorthUpFrame`) and why the human is a rigid mesh.

That frame is a tangent plane. A single tangent at New Bedford is the wrong "up" in Brockton, and the ground falls away from the plane by roughly d² / (2R) — about 200 meters at 50 km. So the playable world is a set of anchors, not one coordinate space. Choosing a place in the GO TO list or on the map rebuilds the frame at that latitude and longitude and spawns you at the origin of it (New Bedford still uses `computeSpawn` so you land on a street by the Bethel).

Tiles themselves stream in earth-centered space around the camera. The memory bounds do not change when you change cities:

| Knob | Phase 1 value | Why |
|---|---|---|
| `errorTarget` | 32 (48 if the frame-time watchdog trips) | Coarser tiles are the main crash lever. Street-level blank ground was the failure a tighter target caused. |
| LRU | 180–280 MB, 2500–3500 tiles | Hard ceiling so the GPU context survives. |
| `maxDepth` | 24 | Stops runaway refinement. The library treats it as exclusive of the next child. |
| Download / parse jobs | 6 / 3 | Caps the burst when a new anchor loads. |
| Device pixel ratio | 1–1.5, or 1–1 after a degrade | Fill-rate on hi-DPI screens. |
| Ground rays | Player every 100 ms, NPCs every 500 ms, 4 non-priority rays per frame | One shared raycaster, eased between samples. |
| Walls | About 20 Hz | Same budget. |
| Collision structure | Mesh BVH on each loaded tile | Rays are not a full triangle walk. |
| Hidden tab | `frameloop="demand"` and tiles `enabled={false}` | Streaming stops. Idle play (8 s) also drops to on-demand frames. |
| Bad key / quota | Classified 401/403/429 overlay, secrets redacted, fallback ground | The canvas is never an empty console error. |

The shared sim (`SimBootstrap`, missions, stats, economy) stays one stack. Earth adapts its pose into that stack; it does not grow a second one. The sim is still bound to the New Bedford slice, because mission targets are in that frame. Other cities' slices are loaded for the map only.

**Phase 2 rebase.** To drive I-195 from Fall River to New Bedford without a teleport, the frame has to move with the player. When the planar distance from the anchor passes about 2 km, convert the pose to lat/lon, build a new anchor under the car, and rewrite the local position back to the origin. Do this between frames, not inside a raycast. Prefetch tiles along the velocity vector. Until that exists, a long highway drive will eventually leave the tangent plane and the ground.

## Driving

The earth car steps the shared `stepVehicleDynamics` with `EARTH_TUNING` (`src/earth/drive.ts`):

- About 32 m/s top speed (~72 mph). Fast enough for an arterial, slow enough that tiles can keep up.
- Throttle builds speed. Lifting off coasts. Holding back while still rolling is a service brake, then reverse once the car is slow.
- Steering authority rises as you start moving and falls again near top speed, so a neighborhood corner is tighter than a highway bend.
- Space in the car is the handbrake. Space on foot is still the jump.
- Rain multiplies grip by 0.7 and lengthens the stop.
- A wall is a speed bleed, not a teleport through the mesh.
- The chase camera sits farther back and catches up more slowly as speed rises. The body leans a few degrees in a turn.

This is still an arcade model. It is not a tire or suspension simulation. Phase 2 can add damage, headlights, and traffic outside New Bedford. Phase 3 can adopt the sim's existing tire helpers if a chase mission needs them.

## On foot

Walk, sprint, jump, melee, and the enter/exit prompt are unchanged in spirit and now allocation-free on the hot path. Footsteps use the OSM surface only on the New Bedford frame, where that slice matches the player. Other cities get the default surface until their sidewalk graphs are bound. Pedestrians and traffic cars still spawn only in New Bedford, because that is the sidewalk graph the shared sim is bound to. Other cities are you, the car, and the photoreal mesh.

## HUD, minimap, map

- The HUD is titled **The Narrows**. It shows the place or street, health, wanted stars, cash, compass, mission line, speed in mph while driving, and a GO TO list grouped by region.
- `M` or MAP opens the chart. Drag pans, the wheel zooms, a click or a sidebar row re-anchors the world on that place.
- The minimap is heading-up, 420 m across, and draws the city's OSM streets when that slice exists, plus highway segments and nearby place names.
- `/earth.html?atlas=1` draws the same chart with no API key, so the map can be reviewed without a tile session. It does not start the 3D world.

The stylized big map and minimap are untouched.

## Missions

`EarthSimBridge` already runs the shared mission runtime, nav distances, and the objective marker. Phase 1 does not add mission content. The characters and missions notes in `docs/CHARACTERS-MISSIONS.md` and `docs/CHARACTERS-MISSIONS-BIBLE.md` are still the source for what those missions should be. New objectives that sit in Fall River, Brockton, or the Cape have to store a place id plus a local offset. A bare New Bedford-frame coordinate is the wrong target once the anchor moves.

## Audio

The radio (talk hosts, station switching, procedural bed when no tracks are present) stays. Engine hum, horn, door, and footsteps stay. Music files stay out of the repo: `.gitignore` plus `scripts/check-no-music.sh`, with exceptions only via `.audio-allowlist`. ElevenLabs keys stay in the host environment (`ENV.md`). Phase 2 audio is footsteps that match the city you're actually in, a night ambience, and gulls/harbor beds near the water — still without committing music.

## Day and night

The sun already follows the shared sim clock: up in the east at 06:00, overhead at noon, down at night, with a moonlight floor so the mesh never goes black. Weather still cycles clear → cloudy → rain on a timer. Phase 2 ties streetlights and headlights to that hour, and lets the player set the hour instead of only watching it.

## Performance budget

Target the photoreal build at a steady frame on a recent laptop, and a degraded tier rather than a context loss on a phone.

- Mean frame time over a 60-sample window above 33 ms drops the pixel ratio to 1 and coarsens `errorTarget` to 48, once.
- Tile memory stays inside the 280 MB / 3500 tile window above.
- Do not raise the New Bedford pedestrian count past 50, and do not spawn that crowd in every city. Each extra skinned or even rigid character is a draw the tiles are already paying for.
- The map redraws at 20 Hz and the minimap at 10 Hz. Neither touches the tile renderer.
- A background tab must not download tiles. That is `enabled={false}` on the tiles renderer, not only a paused canvas.

If it still crashes, raise `errorTarget` before adding content. That is still the fastest knob.

## After phase 1

### Phase 2 — drive the coast

- Rebase the ENU frame as the car travels, with a tile prefetch ahead of the velocity.
- Snap every spawn to a road centerline in that city's slice, so a teleport does not drop you inside a mesh.
- Bind the active city's slice to traffic and pedestrians, with a small cap (the New Bedford crowd does not get copied four times).
- Headlights, streetlights, and a clock control.
- Save the rebase anchor with the pose.

### Phase 3 — the first real loops

- Opening on foot at the Narrows / Battleship Cove, then the New Bedford fish-pier arrival, using the existing mission runtime and place-relative targets.
- One drive that uses I-195 or Route 24 as the road between two mission beats.
- Wanted heat that exists in the earth build, not only as empty stars.

### Phase 4 — the cities as places

- Distinct pedestrian meshes, a small vehicle set, and night traffic.
- Property and cash hooks that already exist in the shared economy, surfaced in earth.
- Brockton and Cape mission threads. No new sim stack.

### Phase 5 — hold up on a real device

- A soak on iPhone Safari: context loss, memory, the rebase, and a save written in one city and loaded in another. This has not been done. A desktop unit test of the rebase is not that soak.
- Richer audio beds per city. Footsteps already sample the road under the car's geographic position. The harbor bed is the one procedural ambience.
- Only then talk about a production tag. Deploys stay manual.

### What a commercial release still needs, and a person has to do

- A Google Maps Platform key with Map Tiles API enabled, billing on, HTTP referrers for `quahog.fullstackassets.com` and the Vercel domains, and a decision about the [Map Tiles API terms](https://developers.google.com/maps/documentation/tile). The page already requests it (`ENV.md`). The key is not in the repo. Photoreal tiles do not draw until someone sets it on the host.
- Licensed or original vehicle, character, and clothing art. The current people are rigid stand-ins. The cars are pack GLBs already in the repo; their license has to be confirmed before a store build.
- Voice, writing pass, and a real mission script. The arc and the campaign are playable text, not a performed story.
- Store setup: age rating, privacy policy, support contact, icons, screenshots, and a host. Nothing here deploys.
- A pass on a mid-range phone and a mid-range laptop with the tiles actually streaming. Memory caps are in code. They have not been proven on that hardware.
- Music, if the game ships with any, stays out of this repo and has to be licensed separately.

## Out of scope until someone asks

Renaming the repo, fetching `Full-Stack-Assets/QUAHOG_Web`, committing API keys, committing music, or deploying from this plan.
