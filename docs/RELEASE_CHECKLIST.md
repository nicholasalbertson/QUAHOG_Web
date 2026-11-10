# Release checklist — The Narrows

The code can boot, drive, save, and show the menus below. A store build still needs a person for every item here. Nothing in this list is done by merging the branch. Production deploys stay manual.

## Google Map Tiles

- [ ] Create the browser key the way `ENV.md` describes: Cloud project, billing, Map Tiles API enabled.
- [ ] Restrict it by HTTP referrer to `https://quahog.fullstackassets.com/*` and `https://*.vercel.app/*`.
- [ ] Restrict it to the Map Tiles API only.
- [ ] Put it in `GOOGLE_MAP_TILES_KEY` on Vercel, or, for the rsync host, bake `VITE_GOOGLE_MAP_TILES_KEY` at build time or drop a gitignored `tiles-key.json`. Do not commit it.
- [ ] Read the current Map Tiles API terms and decide that a commercial game is allowed. A long session spends quota.
- [ ] Confirm the credits screen (pause → Credits) matches the attribution Google requires.

## Assets and audio

- [ ] Confirm the license for every GLB under `/packs` before a store build. The credits screen says to confirm it. It does not grant one.
- [ ] Replace the placeholder people, or license character art.
- [ ] Voice, if the game ships with any, is a separate license. The procedural effects in the repo are generated in the browser.
- [ ] Music stays out of this repo. If a build has music, it is licensed and deployed around git, the way `scripts/build.sh` already says.

## Product

- [ ] Age rating for the store you are shipping to.
- [ ] Privacy policy. The photoreal page stores a save, settings, and (only if someone pastes one) a map key in that browser. Say so.
- [ ] Support contact, icons, screenshots, and the store description.
- [ ] A host. Deploys stay manual: backup, `rsync --delete --exclude 'music/'`, and exclude `tiles-key.json` if you use that file. See `ENV.md`.

## Soak

- [ ] Run `docs/SOAK_TEST.md` on a mid-range laptop and a phone with a real key. Write down the tier, the rebase count, and whether Continue resumed the highway pose.
- [ ] On the phone, confirm the tier settles at medium or low and the page does not reload itself.

## In the build already

These are in the photoreal page so the list above is the human work, not missing screens:

- Graphics auto / high / medium / low, subtitle size, colorblind HUD labels, and a performance line toggled with F3.
- Gamepad: right trigger accelerates, left trigger brakes, Start pauses.
- Loading screen while the street comes in.
- Credits for OpenStreetMap, Google Photorealistic 3D Tiles, and the vehicle packs.
- Crash overlay with a copy button. The text is redacted.
- A job chain for Fall River, New Bedford, Brockton, Cape Cod, and the South Coast towns, from pause → Jobs.
