# Store asset checklist — Mount Hope (§17.8)

Prepared 2026-11-08. Every asset is verified as existing (with path and
measured size) or marked to-be-produced (with its spec and what it needs).
The exact set that applies depends on decision D3 (store/distribution);
this checklist covers the Google Play and App Store sets.

## App icon

| Asset | Spec | Status | Path / notes |
|---|---|---|---|
| Google Play icon | 512x512 PNG | EXISTS, needs rebrand | `public/icons/narrows-512.png` — verified 512x512 on 2026-11-08. Legacy "Narrows" branding; needs rebranding to Mount Hope once D1 (product name) is decided. |
| App Store icon | 1024x1024 PNG | TO BE PRODUCED | Does not exist. Needs a 1024x1024 icon asset (rebrand to Mount Hope once D1 is decided). |
| PWA icon 192 | 192x192 PNG | EXISTS, needs rebrand | `public/icons/narrows-192.png` — verified 192x192 on 2026-11-08. Legacy branding; needs rebranding once D1 is decided. |
| PWA icon 512 (maskable) | 512x512 PNG, maskable | EXISTS, needs rebrand | `public/icons/narrows-512.png` — verified 512x512; listed in `public/manifest.webmanifest` as purpose "any maskable". Legacy branding; needs rebranding once D1 is decided. |
| Apple touch icon | 180x180 PNG | EXISTS, needs rebrand | `public/icons/apple-touch-icon.png` — verified 180x180 on 2026-11-08. Dimensions verified; image content is the legacy icon (content not re-checked). Needs rebranding once D1 is decided. |

## Feature graphic / promo art

| Asset | Spec | Status | Path / notes |
|---|---|---|---|
| Google Play feature graphic | 1024x500 PNG/JPG | TO BE PRODUCED | Does not exist. Needs a 1024x500 feature graphic. No placeholder art — produce from real game imagery (device capture) or commissioned art. |
| App Store promo art | None required | N/A | App Store does not require a feature graphic. Screenshots carry the listing. |

## Screenshots

| Asset | Spec | Status | Path / notes |
|---|---|---|---|
| Google Play phone screenshots | Min 2, up to 8; 1080x1920 (9:16) or 16:9 | TO BE PRODUCED | None exist in the repo. Need a real-device capture pass: Nic's iPhone, the live build, capturing gameplay (driving, missions, radio, districts). Do not ship placeholder art. |
| App Store 6.5" screenshots | 1242x2688 (iPhone 6.5") | TO BE PRODUCED | None exist. Same device capture pass as above. |
| App Store 5.5" screenshots | 1242x2208 (iPhone 5.5") | TO BE PRODUCED | None exist. Same device capture pass as above. |
| iPad screenshots | 2048x2732 (12.9" iPad) | TO BE PRODUCED, if iPad is a target | None exist. Only needed if iPad is a launch target (decision D3). |

## Promo video (optional)

| Asset | Spec | Status | Path / notes |
|---|---|---|---|
| Store promo video | 30–60 s, YouTube link (Google Play) or App Preview (App Store) | NOT PRODUCED, optional | Not required for submission. Do not produce until D3 (store) is decided; a promo video is a separate production task. |

## PWA packaging files (related — §17.8 other half)

| Asset | Spec | Status | Path / notes |
|---|---|---|---|
| Web app manifest | `manifest.webmanifest` | EXISTS, needs rebrand | `public/manifest.webmanifest` — exists, but uses the legacy name "The Narrows — Blizzard of '26" and short_name "The Narrows". Needs updating to Mount Hope once D1 is decided. Icon entries point to `./icons/narrows-192.png` and `./icons/narrows-512.png`. |
| Service worker | PWA offline/cache | NOT DONE | No service worker file exists in the repo. PWA packaging is not done; this is §17.8's other half and is out of scope for this store-packaging directory. |

## What blocks a submission today

1. D3 (store/distribution) — decides which asset set applies.
2. D1 (product name) — decides the branding on every icon and the
   manifest. The existing icons are usable as sizes but carry the wrong
   name.
3. Screenshots — none exist; need Nic's iPhone capture pass on the live
   build.
4. Feature graphic (Google Play) and App Store 1024 icon — do not exist.
5. D6 (privacy policy) — a policy is needed before any store submission.
6. D5 (age rating) — needed for the store listing.
7. D4 (first release version) — needed for the build that is submitted.
