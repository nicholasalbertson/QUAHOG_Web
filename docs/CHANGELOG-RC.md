# Changelog — release candidate track

## 2026-11-07 — Reintegrate onto live `main` (5b66d34)

Ported the open-world sim layer + RC polish from the bf4e agent tip (`92feb8a`) onto the live radio/expansion lineage without replacing pack-based StreetLife / Franklin.

- `src/sim/**` + foundations (GameLoop, PedGraph, ClockWeather w/ snow sync, SaveGame, AcceptanceHarness)
- PedGraph sidewalk routing behind `flag.pedGraph` (default on for stylized)
- Soak harness: `?debug&soak=1&perf=1` (see `docs/FPS-MATRIX.md`)
- Borden cast: menu preview PNGs; in-world `usePrimitiveBody` until human GLBs ship
- `npm run assets:audit` expanded for live pack/tier1/blenderkit trees


## Unreleased / RC

### Added
- Independent open-world sim layer (`GameLoop`, `PedGraph`, `MissionRuntime`, `SaveGame` v2, heat tiers, streamer metrics).
- Borden character pack (Lizzie, Remington Borden) with Character menu picker.
- Asset license catalog (`public/assets-licenses.json`) + `npm run assets:audit`.
- Fog/rain stream-radius scaling; boat Continue persistence; fixed-step car/boat.

### Changed
- Earth demoted to diagnostic (`docs/EARTH-DECISION.md`); stylized canvas is the product boot.
- Continue gate requires stats + position; mission optional for legacy saves; New Game clears unified + legacy domains.
- `docs/IMPLEMENTATION-CHECKLIST-V3.md` status synced to post-#14 live lineage (v3.1).

### Known blockers (not in this RC)
- Cape Cod / Fall River authored tiles (campaign mid/late map).
- Named-device FPS matrix + 30-minute stream memory soak (measurement pending).
- ElevenLabs music/TTS commercial entitlement confirmation (`pending-commercial` in license audit).
