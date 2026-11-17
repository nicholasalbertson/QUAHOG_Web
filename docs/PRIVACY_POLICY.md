# Privacy policy (draft)

This is a draft for a person to review before any store submission. It is not legal advice, and it is not published.

**The Narrows** is a browser game. The street map is `index.html`. The photoreal page is `earth.html`. Nothing in this repository deploys the game.

## What the game stores on the device

- Save slots, settings, control bindings, the discovery log, and scrimshaw progress in `localStorage`.
- A developer map key, if someone pastes `?key=` into the address bar, in `sessionStorage` for that tab. The page then removes it from the URL.
- No account, no email, and no analytics SDK are in this build.

## What leaves the device

- The street map reads OpenStreetMap slices that ship with the game. Those files do not contain a player identity.
- The photoreal page asks Google for Photorealistic 3D Tiles. The browser sends the request, including the page's referrer, straight to `tile.googleapis.com`. This project does not proxy those tiles and does not cache them. Google's terms and privacy policy cover that traffic.
- On a host that has `GET /api/tiles-key`, the page asks its own origin for a browser key. The key is not written into the repository.

## What this draft does not cover

Voice, a publisher account, crash uploads to a third party, or a custom server log. None of those are in this build. If any of them is added, this draft has to be rewritten before it is shown to a player.
