# Mount Hope — Store listing & release copy (§16–17)

Prepared 2026-11-07. Text/metadata only — no submission, no spend, no store
account created. Every decision below is Nic's; nothing here picks for him.

## Canonical identity (from code)

- **Name:** Mount Hope (`src/registries.ts` `BRAND.name`).
- **Tagline:** SouthCoast open world (`BRAND.tagline`).
- **Package:** `quahog-web`.
- **Brand (D1 DECIDED 2026-11-08, Nic):** product name is **Mount Hope: The Narrows**. The start menu currently displays the legacy alias **THE NARROWS**; changing it to the decided name is a one-line catalog edit. The pause menu and model credits already say Mount Hope.

## Store listing copy (draft — en-US)

### Short description (80 chars)

> Open-world driving and missions across the SouthCoast — New Bedford to Hyannis.

### Long description (draft)

> Mount Hope is an open-world game set on the Massachusetts SouthCoast. Drive
> and walk a living map of New Bedford, Fall River, Brockton, and Hyannis —
> real streets, real landmarks, and the working waterfront.
>
> Run missions across three acts, from the docks of New Bedford to the
> Kennedy Compound in Hyannis Port. Buy fronts around the city and collect
> their payout every day. Hunt scrimshaw across the map. Tune into fifteen
> local radio stations — harbor Americana, mill-town rock, and more — as you
> drive.
>
> Outrun the heat, or lay low at the safehouse until it cools off. The city
> is yours to learn, one block at a time.

### Keywords (draft)

open world, driving, SouthCoast, New Bedford, Fall River, missions, radio,
sandbox, crime, waterfront

### Categories (draft)

Games · Adventure / Open World (store taxonomy varies — see Decisions).

### What's in the build (verified, not aspirational)

- 4 districts: New Bedford, Fall River, Brockton, Hyannis (Cape).
- 11 missions across 3 acts (Off the Boat → Big Mamie).
- 15 radio stations with local hosts and original songs.
- Buyable fronts (businesses) with daily payout; scrimshaw collectibles.
- Wanted/heat system with star tiers; vehicles, boats, on-foot play.
- Save/Continue with autosave; PWA-capable web build.

### Screenshots / store art — NOT produced

Store screenshots, icon, and feature art need a real-device capture pass
(Nic's iPhone, the live build) and an icon asset. Do not ship placeholder
art. Listed here so the asset gap is explicit.

## Localization status (§16)

- **§16.1 (partial, landed 2026-11-07):** `src/i18n/strings.ts` is the en-US
  string catalog; StartMenu + HUD chrome are wired through it (`t()`/`tf()`).
  Mission titles/objectives live in `src/mission.ts` (already centralized
  data). Remaining surfaces (PauseMenu, toasts, prompts, radio copy) still
  carry hardcoded strings — externalize by section as they are touched.
- **§16.2–16.10:** not started. Key naming convention + missing/unused-key
  lint, pluralization, font fallback, RTL, subtitle timing, VO pipeline doc,
  pseudo-locale build, per-locale screenshot diff, CI gate — all open.
- **Languages shipped:** en-US only. No other locale is translated or
  planned — see Decisions.

## Release status (§17)

- **§17.1 Build targets:** stylized is the playable boot; earth scope is
  PENDING Nic's pick (2026-11-07 23:17: "Move forward on the earth dem beyond
  diagnostic" — reverses the earlier diagnostic demotion; do not build earth
  until he picks the scope). `docs/EARTH-DECISION.md` (demote to diagnostic)
  is superseded by that order.
- **§17.2 Environments:** dev / staging / prod exist (staging behind
  basic_auth; prod is the live site). Config split is ad hoc, not a
  formalized env file per target.
- **§17.3 Versioning:** `package.json` is `quahog-web 0.0.0` — no semantic
  version is set. First release version is a decision (see below).
- **§17.4 Error reporting:** not implemented. No Sentry or equivalent is
  wired; no PII scrubbing policy exists.
- **§17.5 Analytics:** not implemented. No opt-in, no docs.
- **§17.6 Feature flags:** `src/flags.ts` exists (per §0.2); no canary
  rollout plan is written.
- **§17.7 Rollback:** documented in `docs/ROLLBACK.md`; not tested as a
  procedure.
- **§17.8 PWA + store listing:** PWA packaging not done; this document is
  the listing draft.
- **§17.9 Release checklist:** `docs/RELEASE-CHECKLIST.md` (partially
  checked; FPS matrix + soak still pending real-device measurement).
- **§17.10 Hotfix path:** not documented.

## Decisions for Nic (do not guess — pick one per row)

| # | Decision | Options | Notes |
|---|----------|---------|-------|
| D1 | Product name on the store + menu | **DECIDED 2026-11-08 (Nic): (c) Mount Hope: The Narrows** | Start menu currently shows THE NARROWS; changing it to the decided name is a one-line catalog edit. |
| D2 | Price | **DECIDED 2026-11-08 (Muse, per Nic's 00:21 order to decide): (a) Free** | Nic is not selling this game (2026-11-02 intent). No price set anywhere today; no payment flow exists. |
| D3 | Store / distribution | **DECIDED 2026-11-08 (Muse, per Nic's 00:21 order to decide): (b) Web + PWA install** | Web build exists and is live; PWA packaging is §17.8's other half (not done). App Store/Steam need accounts, review, spend — not authorized. |
| D4 | First release version | **DECIDED 2026-11-08 (Muse, per Nic's 00:21 order to decide): (a) 0.1.0** | `package.json` is 0.0.0 today. Bump to 0.1.0 at release time, not before. |
| D5 | Age rating | **DECIDED 2026-11-08 (Muse, per Nic's 00:21 order to decide): (b) 17+** | Game has guns, crime, wanted/police. Content label for the web listing; no ESRB submission (distribution is Web + PWA). |
| D6 | Privacy policy + data collection | **DECIDED 2026-11-08 (Muse, per Nic's 00:21 order to decide): (a) No analytics, no account, local saves only** | Current state. A privacy policy stating local-only is still needed before any store submission. |
| D7 | Error reporting | **DECIDED 2026-11-08 (Muse, per Nic's 00:21 order to decide): (a) None** | No error reporting exists; Sentry needs an account + spend (not authorized). |
| D8 | Languages at launch | **DECIDED 2026-11-08 (Muse, per Nic's 00:21 order to decide): (a) en-US only** | §16.2–16.10 are unbuilt; a second locale needs the full pipeline, not just translation. |
| D9 | Release name / tagline | **DECIDED 2026-11-08 (Muse, per Nic's 00:21 order to decide): Keep "SouthCoast open world"** | Tagline is in BRAND; changing it is one line. |

## What this document does NOT do

- No store submission, no account creation, no spend.
- No screenshots, icon, or feature art (needs a device capture pass).
- No privacy policy text (needs D6).
- No version bump (needs D4).
