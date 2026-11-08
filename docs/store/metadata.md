# Store metadata — Mount Hope: The Narrows (§17.8)

Prepared 2026-11-08. Decisions D1–D9 all decided (see `docs/STORE-LISTING.md`). Nothing here guesses a decision.

## Identity

- Package name: `quahog-web` (from `package.json` `name`).
- Product name: Mount Hope: The Narrows (D1 decided 2026-11-08 by Nic, option c). The start menu copy change is in the l10n pass; the PWA manifest name/short_name are updated.
- Tagline: SouthCoast open world (from `BRAND.tagline`). D9 decided 2026-11-08: keep it.

## Version

- Current `package.json` version: `0.0.0`.
- First release version: 0.1.0 (D4 decided 2026-11-08, option a). Do not bump `package.json` until release time.

## Store / distribution

- Web + PWA install (D3 decided 2026-11-08, option b).
- Current state: web only, at the production site. PWA packaging (§17.8, other half) is not done — that's the follow-up work for D3. No store account exists; no submission has started.

## Price

- Free (D2 decided 2026-11-08, option a). Nic is not selling this game. No price set anywhere; no payment flow exists.

## Age rating

- 17+ (D5 decided 2026-11-08, option b). Content label for the web listing; no ESRB submission (distribution is Web + PWA).

## Content notes (for the age-rating decision)

The game contains, as shipped in the build:

- Guns and shooting (combat is part of missions and the wanted system).
- Crime (missions involve criminal activity; fronts are criminal businesses).
- Wanted/police heat with star tiers and police response.
- No sexual content, no gambling for real money, no loot boxes.

## Privacy / data collection

- No analytics, no account, local saves only (D6 decided 2026-11-08, option a). Current state, verified: local saves only. No analytics, no error reporting, no accounts, no data leaves the device.
- Privacy policy: NOT WRITTEN — a policy stating local-only is still needed before any store submission.
- Error reporting: None (D7 decided 2026-11-08, option a). Not implemented; no Sentry account, no spend.

## Languages

- Shipped: en-US only (D8 decided 2026-11-08, option a). No other locale is translated or planned. A second locale needs the full §16 pipeline, not just translation; §16.2–16.10 are unbuilt.

## Categories

- Games, Adventure / Open World. Distribution is Web + PWA (D3), so the applicable listing set is the PWA/web set, not a store taxonomy.

## Content rating / store requirements that follow from D3

Distribution is Web + PWA install (D3). The asset checklist in `assets.md` covers the Google Play and App Store sets; for Web + PWA the applicable assets are the PWA install set (icons + manifest, already present except the 1024 icon) plus the web listing copy. Store screenshots are still to be produced (real-device capture pass on Nic's iPhone).
