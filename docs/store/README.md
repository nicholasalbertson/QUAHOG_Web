# Store packaging — docs/store/ (§17.8)

Prepared 2026-11-08. Text/metadata only — no submission, no account, no
spend. This directory is the store packaging deliverable for the Mount Hope
checklist §17.8.

## What lives here

- `listing.md` — the store listing copy: title, tagline, short description,
  long description, keywords, categories. Written from the game's actual
  content (verified against code — see the verification notes in that file).
- `metadata.md` — store metadata: package, version, store/distribution,
  age rating, privacy, languages, content notes. Each field has a verified
  value or names the decision it needs.
- `assets.md` — the asset checklist: every required store asset (icon,
  feature graphic, screenshots), each verified as existing (with path and
  measured size) or marked to-be-produced (with its spec and what it needs).

## Relationship to docs/STORE-LISTING.md

`docs/STORE-LISTING.md` is the canonical §16–17 status and decision record
(it holds the §16 localization status, the §17 release status, and the nine
decisions D1–D9 with their options). This directory (`docs/store/`) is the
packaging deliverable built from that record: the copy, metadata, and asset
checklist a store submission would actually use. If the two ever disagree,
`docs/STORE-LISTING.md` is the authority for decisions and status; update
both when a decision lands.

## Status

Complete now:

- Listing copy written and verified against code (11 missions, 15 stations,
  4 districts — all counted from source, not copied from a summary).
- Metadata fields filled where a verified value exists; the rest name their
  decision (D1–D9).
- Asset checklist written with every asset verified as existing or marked
  to-be-produced with its spec.

To be produced (not in this directory — they need a device capture pass or
art work):

- App icon at 1024x1024 (App Store) — does not exist.
- Feature graphic 1024x500 (Google Play) — does not exist.
- Store screenshots — none exist in the repo; need a real-device capture
  pass (Nic's iPhone, the live build).
- The existing icons (192/512/180) use the legacy "Narrows" branding and
  need rebranding to Mount Hope once D1 (product name) is decided.

## Decisions for Nic (do not guess — pick one per row)

The nine decisions are D1–D9 in `docs/STORE-LISTING.md` (product name,
price, store/distribution, first release version, age rating, privacy
policy + data collection, error reporting, languages at launch, release
name/tagline). The legal/marketing decisions among them are D1 (product
name), D2 (price), D3 (store/distribution), D5 (age rating), D6 (privacy
policy + data collection), and D7 (error reporting). Nothing in this
directory picks for him.

## What this directory does NOT do

- No store submission, no account creation, no spend.
- No screenshots, icon, or feature art (needs a device capture pass / art).
- No privacy policy text (needs D6).
- No version bump (needs D4).
- No PWA packaging (service worker) — that is §17.8's other half, not
  done; see `docs/STORE-LISTING.md`.
