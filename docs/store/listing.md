# Store listing copy — Mount Hope: The Narrows (§17.8)

Prepared 2026-11-08. Draft — en-US. No angle brackets anywhere in the
copy text (store descriptions reject them). Title decided (D1, 2026-11-08):
Mount Hope: The Narrows.

## Title

Mount Hope: The Narrows

D1 decided 2026-11-08 (Nic): option (c), Mount Hope: The Narrows. The
start menu currently shows the legacy alias THE NARROWS; changing it to
the decided name is a one-line catalog edit.

## Tagline

SouthCoast open world

From `src/registries.ts` `BRAND.tagline`. Provisional pending D9 (release
name/tagline).

## Short description

Open-world driving and missions across the SouthCoast — New Bedford to Hyannis.

Character count: 79. (Google Play short description limit is 80; this
fits.)

## Long description

Mount Hope: The Narrows is an open-world game set on the Massachusetts SouthCoast. Drive
and walk a living map of New Bedford, Fall River, Brockton, and Hyannis —
real streets, real landmarks, and the working waterfront.

Run missions across three acts, from the docks of New Bedford to the
Kennedy Compound in Hyannis Port. Buy fronts around the city and collect
their payout every day. Hunt scrimshaw across the map. Tune into fifteen
local radio stations — harbor Americana, mill-town rock, and more — as you
drive.

Outrun the heat, or lay low at the safehouse until it cools off. The city
is yours to learn, one block at a time.

## Keywords

open world, driving, SouthCoast, New Bedford, Fall River, missions, radio,
sandbox, crime, waterfront

## Categories

Games, Adventure / Open World. (Store taxonomy varies by store — see
decision D3.)

## Verification notes (checked against code 2026-11-08)

- 4 districts: New Bedford, Fall River, Brockton, Cape Cod — Hyannis.
  Counted from `src/districts.ts` (ids newBedford, fallRiver, brockton,
  cape).
- 11 missions across 3 acts: Off the Boat, Auction Rules, The Linguiça
  Run, Harbor Heat (Act I); Spindle City, Acquitted, The Undefeated
  (Act II); Heritage Marina, Compound Interest, Blizzard of '26, Big
  Mamie (Act III). Counted from `src/mission.ts` mission titles.
- 15 radio stations: anvil, block, bog, dune, federalhill, foundry,
  harborlight, hub, mare, nightcircuit, padanaram, rage, spindle,
  whale, whalebone. Counted from `src/audio/radioEngine.ts` station ids.
- Buyable fronts with daily payout: present (`src/HUD.tsx`,
  `src/__tests__/economy.test.ts`).
- Scrimshaw collectibles: present (referenced in `src/HUD.tsx` and
  tests).
- Wanted/heat system: present (GameSystems heat decay + autosave;
  star tiers in the checklist §3).
- Vehicles, boats, on-foot play: vehicles and on-foot play in the
  build; boats are mission/world content.
- Save/Continue with autosave: present (`src/world/GameSystems.tsx`
  wall-clock autosave).
- PWA-capable web build: the web build exists; the service worker /
  PWA packaging itself is not done (§17.8, other half).

Nothing in this copy claims a feature, rating, or store that is not in
the build. No review scores, no awards, no "best" claims.
