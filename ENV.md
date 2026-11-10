# Environment variables (Vercel → projectsouthcoast → Settings → Environment Variables)

Secrets (API keys) are **never** committed. Voice IDs are public identifiers and
are recorded here for reference.

## Photorealistic 3D Tiles — `earth.html`

Players open `/earth.html` with no `?key=` in the address. The page asks the
host for a **browser** key. Google's tiles renderer calls `tile.googleapis.com`
from the browser, so this key does reach the page. What keeps it from being
abused is the restriction below, not hiding the string.

`?key=` remains a developer override for the current browser tab. It is removed
from the address bar and is not written to `localStorage`, so it cannot shadow
the site key on the next visit.

### Create and restrict the key

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project for this site.
2. Link a billing account. Map Tiles is a billed API. Without billing, Google refuses the key.
3. APIs & Services → Library → enable **Map Tiles API**. That is the API Photorealistic 3D Tiles uses.
4. APIs & Services → Credentials → Create credentials → API key.
5. Edit the key.
   - Application restriction: **HTTP referrers**.
   - Add these referrers:
     - `https://quahog.fullstackassets.com/*`
     - `https://*.vercel.app/*`
   - For local `vite` only, also add `http://localhost:5173/*`, `http://localhost:4173/*`, and `http://127.0.0.1:5173/*`. Leave those off the production key if you keep a separate dev key.
   - API restriction: **Restrict key** → **Map Tiles API** only. Do not leave the key unrestricted, and do not add other Google APIs to it.
6. Store the key in the host environment described below. Do not commit it, paste it into a screenshot, or ship it in a URL.

Use a dedicated `GOOGLE_MAP_TILES_KEY`. The Static Maps key further down is a server secret (often paired with a URL-signing secret) and is the wrong key to put in a browser. The fallback to `GOOGLE_MAPS_API_KEY` exists only when that variable is already a referrer-restricted Map Tiles browser key.

Google bills per tile session. The Map Tiles terms govern use of the imagery.

### Vercel

Set `GOOGLE_MAP_TILES_KEY` on the project (Settings → Environment Variables) and redeploy. If that variable is empty, `api/tiles-key.ts` falls back to `GOOGLE_MAPS_API_KEY`.

`earth.html` requests `GET /api/tiles-key`. The handler uses the same same-origin guard as the other functions, returns `{ "key": "…" }` with `Cache-Control: private, no-store`, and returns 404 `{ "error": "tiles_key_unconfigured" }` when neither variable is set. The response body is not logged.

On Vercel, do **not** also set `VITE_GOOGLE_MAP_TILES_KEY`. A `VITE_` value is copied into the JavaScript bundle. The function is enough, and it keeps the key out of the built files.

`vite dev` does not run the function. Locally, use `?key=` for the current tab, a gitignored `.env.local` containing `VITE_GOOGLE_MAP_TILES_KEY`, or the paste box on the missing-key screen. `vercel dev` serves `/api/tiles-key` when the server variable is in the environment.

### Manual rsync (no Vercel functions)

`quahog.fullstackassets.com` can be updated by copying `dist/` onto the host. That copy does not include `api/`, so `/api/tiles-key` will 404 there. Either of these works. Both still require the referrer and API restrictions above.

**Build-time key** (it travels inside the rsync):

```
VITE_GOOGLE_MAP_TILES_KEY='the-key' npm run build
```

If that variable is unset, the build uses `VITE_GOOGLE_MAPS_API_KEY`. Then rsync `dist/` the usual way (`rsync --delete --exclude 'music/'`). The key is visible in the earth bundle. That is expected for a static host, and it is why the referrer list and the Map Tiles API restriction are required. Rotating the key means building again. Do not commit `.env`, `.env.local`, or a `dist/` that was built with the key.

**File beside the page** (rotate the key without rebuilding):

After rsync, place `tiles-key.json` in the same directory as `earth.html`:

```
{"key":"the-key"}
```

The page fetches `./tiles-key.json` when the function and the `VITE_` var are both absent. The filename is gitignored. `rsync --delete` removes it unless the file is excluded and written on the host:

```
rsync -a --delete --exclude 'music/' --exclude 'tiles-key.json' dist/ user@host:/path/to/site/
```

Write the json on the host after the sync (or copy it back from outside the synced tree). Do not put this file in the repo. A later sync that forgets the exclude will delete it, and the missing-key screen comes back until the file is restored.

### What the player sees

The page tries sources in this order: `?key=` (this tab only), the `VITE_` value, `/api/tiles-key`, `./tiles-key.json`, then a key pasted into the notice (`localStorage`, this browser only).

- No key anywhere: a full-screen notice. The address bar is not part of the instructions.
- Google returns 401 or 403, or 400 because the key is invalid: an overlay that the map key was refused. Driving on the plain ground still works.
- Google returns 429: an overlay that the tile quota is used up, with the same plain-ground fallback.
- `/earth.html?atlas=1` still opens the chart with no key and does not wait on these requests.

## Google Static Maps (satellite ground) — `api/staticmap.ts`
| Key | Notes |
|---|---|
| `GOOGLE_MAPS_API_KEY` | required (secret) |
| `GOOGLE_MAPS_URL_SIGNING_SECRET` | URL signing secret for the same key |

## ElevenLabs VO (radio hosts + future dialogue) — `api/tts.ts`
**`ELEVENLABS_API_KEY` is the only required var** — every host now has a built-in
premade voice fallback (see `DEFAULT_VOICES` in `api/tts.ts`), so VO works the
moment the key is set. The per-character vars below are **optional overrides**.
| Key | Value | Character / use |
|---|---|---|
| `ELEVENLABS_API_KEY` | secret | **required** for any ElevenLabs VO audio |
| `ELEVENLABS_MIKE_VOICE` | `nUEpF21E0nXsKMw4L4CS` | **Shaun - Boston** → Iron Mike Fontaine (The Anvil / WBOX) |
| `ELEVENLABS_SULLY_VOICE` | _optional_ (default: Sam) | Sully (WHALE 92.1) |
| `ELEVENLABS_BUDDY_VOICE` | `SA7eD52NRr8WAehitVt1` | Buddy Mello (The Rage 1480) |
| `ELEVENLABS_TIA_VOICE` | _optional_ (default: Rachel) | Tia Conceição (Maré Alta 105.3) |
| `ELEVENLABS_DEFAULT_VOICE` | _optional_ | fallback for any unmapped character key |

> If hosts are silent: confirm `ELEVENLABS_API_KEY` is set in Vercel **and**
> redeploy (env-var changes only take effect on a new deployment). Without the
> key, `/api/tts` returns 503 and hosts fall back to the browser Web-Speech
> voice, which is unreliable/often silent on mobile.

## ElevenLabs Music (station tracks) — `scripts/gen_music.py`
Generates royalty-free instrumental tracks (uses the same `ELEVENLABS_API_KEY`):
```
ELEVENLABS_API_KEY=sk_... python3 scripts/gen_music.py
```
Writes `public/music/<station>/track*.mp3` + `manifest.json`. The radio plays
them on the matching music station (WHALE=`whale`, Maré Alta=`mare`) and **falls
back to the procedural synth** when no tracks are present. Docs:
https://elevenlabs.io/docs/api-reference/music

## Voice value format
Value may be an ElevenLabs **voice_id** (used directly) or a voice **display name**
(resolved against your account's voice list). Missing key/voice → that host falls
back to the browser Web-Speech voice (nothing breaks).
