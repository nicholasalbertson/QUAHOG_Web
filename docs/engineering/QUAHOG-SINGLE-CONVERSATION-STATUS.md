# QUAHOG / Mount Hope: The Narrows — current checkpoint

## Checkpoint 2026-11-15 — production-preflight test repair (slice 2)

- VERIFIED-NOW `main` still `755404442fd362ff6e2ea5beac4fc6899bc0587d`; this branch is two commits on top of it.
- Root cause: both preflight tests ran against committed baselines that pin the exact bytes of the 2026-11-02 release package. Every later source commit made them red. `src/earth/Vehicles.tsx` (renamed to `src/earth/vehicleTypes.ts` on 2026-11-03) was the first visible symptom; against an identical copy of current main the full-tree tool reported 134 conflicts and the focused tool 9.
- Changed:
  - `scripts/production-lineage.mjs` (new): shared `PROTECTED_PATHS` (now `src/earth/vehicleTypes.ts`), `sha`, file listing, arg parsing.
  - `scripts/production-rebaseline.mjs` (new): deterministic generator for the package side of either baseline. Keeps `before`/prior-handoff hashes verbatim, moves every superseded hash into a lineage list, declares dropped paths in `removed`/`retired`. Writes only `--out`.
  - `scripts/production-preflight.mjs`, `scripts/production-fulltree-preflight.mjs`: optional `--manifest`; accept hash lists; full-tree tool enforces `removed` (package must not ship it; live copy absent or in lineage). With the committed baselines their verdicts are unchanged (still BLOCK, fail closed).
  - Tests now generate a baseline from the tree under test, and add: lineage never dropped, generator deterministic, removed-path live edit blocks, missing live file blocks, stale committed baseline blocks.
- NOT changed: the committed `scripts/production-baseline.json` and `scripts/production-fulltree-baseline.json`. Regenerating them is a release decision (they authenticate a live tree); run the generator and review the diff at release time.
- VERIFIED-NOW `npm run test:production-assets` exit 0, 42/42 (was 37/39).

## Checkpoint 2026-11-09 20:20 America/New_York — Continue contract slice

Status tags: VERIFIED-NOW (run in this session), SOURCE-INSPECTED, UNVERIFIED, BLOCKED.

### Source
- VERIFIED-NOW `QUAHOG_Web-main 3.zip` SHA-256 `54e71b667f61776c3a048e6fccc737b4c4b1a7e07c178fcf05b92a35e1ba3501`, 7,280 entries.
- VERIFIED-NOW GitHub `nicholasalbertson/QUAHOG_Web` `main` = `755404442fd362ff6e2ea5beac4fc6899bc0587d` (2026-11-08, CobbleCurbPads inside `<Physics>`). Repository readable anonymously (public).
- VERIFIED-NOW `diff -rq` of the extracted ZIP against a clean checkout of that commit: **0 differences**. The ZIP is `main@7554044`.
- VERIFIED-NOW PR #26 head `10e0362d5c2e518fa479c083c281328b7c45016c` (`FullStackAssets/graphics-upgrade-d5da`) still open (a `refs/pull/26/merge` ref exists). Not reviewed in this slice.
- Work branch (local only): `claude/continue-contract`, one commit on top of `7554044`. **NO UPSTREAM CHANGE** — this session has read-only git access.

### Changed
- `src/sim/SaveGame.ts` — `canContinue()` rewritten as the single Continue contract (doc comment holds the rules); `ContinueGate` gains `restores` and `notes`; new `autosaveDue()` / `AUTOSAVE_INTERVAL_MS`.
- `src/ui/StartMenu.tsx` — own `hasSave()` OR-check on key literals removed; uses `canContinue()`. Fresh install shows no "unavailable" line; unusable save shows the real reason; degraded save says what falls back.
- `src/world/GameSystems.tsx` — wall-clock autosave gated on `started` via `autosaveDue()`; first STARTED frame saves immediately; key literals replaced by `SAVE_KEYS`.
- `src/game.ts` — stats key from `SAVE_KEYS.stats`.
- `src/i18n/strings.ts` — `menu.continueUnavailable` is now `"Continue unavailable · {reason}"`; new `menu.continueDegraded`.
- Tests: new `src/__tests__/sim/continueContract.test.ts` (15 tests); `saveGame.test.ts` and `i18n.test.ts` updated to the contract.
- Persistence: no key renamed, no schema change, no migration needed; the gate only reads and never deletes.

### Bugs this closes (both reproduced on `main@7554044` in headless Chrome before the fix)
1. Phantom Continue: the title screen's first rendered frame wrote `mounthope.save.v1`; after a reload the menu offered CONTINUE for a game never started.
2. Fresh install displayed "Continue unavailable · missing stats".
3. `StartMenu.hasSave()` (stats OR pos) disagreed with `canContinue()` (stats AND pos, blocked on malformed mission).

### Verified (VERIFIED-NOW, Node v22.23.4, Linux container)
- `npm ci` exit 0 · `npx tsc --noEmit` exit 0
- `npm test` — baseline 100 files / 691 tests pass; after change 101 files / 706 tests pass
- `npm run test:blizzard` exit 0 · `npm run check:sim-rng` exit 0 · `npm run assets:audit` exit 0 · `npm run build` exit 0
- `npm run test:production-assets` exit 1 — **pre-existing on untouched main** (37/39): `production-fulltree-preflight.test.mjs` and `production-preflight.test.mjs` (ENOENT `src/earth/Vehicles.tsx`).
- `bash scripts/check-no-music.sh` exit 1 — **pre-existing**: 11 `public/music/*/host/manifest.json` not in `.audio-allowlist`. The 44 tracked MP3s are allowlisted radio-host lines (`line-01..04.mp3`, 4.0 MB total). Nothing added, removed or republished.
- Browser smoke, built bundle, Google Chrome headless + SwiftShader, 844x390: fresh title → no save keys after 6 s, no "unavailable" line; reload → still NEW GAME only; New Game → `pos`/`save`/`settings` keys written; reload → CONTINUE + NEW GAME; Continue → restored to the saved position (-256.0, 106.0); 0 page errors. Screenshots timed out under software GL — none collected.
- SOURCE-INSPECTED: `CobbleCurbPads` inside `<Physics>` on main (commit subject + scene booted in the smoke).

### Unverified / blocked
- UNVERIFIED: any physical iPhone / Safari behaviour, FPS, thermals, touch. The smoke is desktop Chrome software rendering.
- UNVERIFIED: production/staging build lineage; music/host-line rights; `pending-commercial` asset rows.
- UNVERIFIED: walk/drive/mission/Earth-mode flows beyond boot + save + Continue; the seven Blizzard/003A invariants beyond their unit suites.
- BLOCKED: push / PR (read-only git in this session).

### Release
No deployment performed. Staging, production, DNS, secrets, repository visibility untouched.

### Next slice
Done in slice 2 above. Next: fix `scripts/check-no-music.sh` (11 host `manifest.json` files not in `.audio-allowlist`) without adding or removing any audio, then review PR #26.

---

# Historical baseline (2026-11-01) — superseded by the checkpoint above

Date: 2026-11-01T18:55:04+00:00 (UTC)
Scope: game implementation and coordination, this QUAHOG project conversation.

## One place, one source, one active implementation
- All new game instructions, changes, QA, evidence and release decisions stay in this conversation. The user should be able to say **Continue** here; no moving work between other chat threads or copying handoff prompts.
- Use the attached **QUAHOG_Cinematic_Mobile_Merged_Source_2026-11-01.zip** as the current **local candidate**, not GitHub main or an expired deployment transfer. Candidate commit: `7c6ce35e05e697f9f285682de6fa3dc354b24e26`.
- Do not invent live VM access or treat the imported local commit as a verified production ancestor. Before altering a live environment, compare the deployment and rollback state to this candidate.
- Do not invoke Muse unless specifically requested. Any unavailable deployment permissions are reported here rather than silently delegated. Nothing is deployed without explicit authorization.
- Existing Blizzard staging is **user-accepted** (reported in chat) and production stays on Build 003A (reported). No new deployment was initiated.

## Verified checks in this conversation
- Full source archive SHA-256: `49bd9fbada0d3b4592d5be5471c69e3d586c130305510e6e043cf29ceca31112`. ZIP CRC check passed.
- All 1,195 source files in ZIP matched the extracted isolated checkout byte-for-byte.
- Node 22 built-in checks: **11/11 architectural tests pass**, **7/7 Blizzard tests pass**.
- The globally available TypeScript 5.6 parser checked **142 TypeScript/TSX files, 0 syntax errors**. This is a syntax check, not a typecheck.
- Source preservation report records 1,001 unchanged public assets, including 26 music files, and 24 protected code files. The preservation manifest reports no mismatches. The current extracted public/music directory contains 26 files.
- `npm ci` could not resolve registry tarballs (EAI_AGAIN). This environment does not have Vite/Vitest/React/Three dependencies, so **full typecheck, 50+ unit tests, Vite build and rendered browser QA remain BLOCKED/UNVERIFIED** for this candidate. No claims of a successful new build are made.
- Physical iPhone Safari FPS, p95 frame time, thermals, touch interactions, navigation, saved sessions and long-session stability remain UNVERIFIED for this candidate.

## Preserved project boundaries
Keep the existing React/TypeScript/Vite, Three/R3F, Rapier, GIS, missions, vehicles, music, radio, fast-travel and saves. Preserve source rights, existing music and private files. Keep Google Photorealistic 3D Tiles separate from independent game geometry. No migration, public release or spending without approval. Stage before major production promotion and protect an established rollback.

## Immediate technical backlog
1. Reestablish pinned npm dependencies in a permitted reproducible build runtime. Run `npm ci`, `npm test`, `npm run test:blizzard`, `npm run build` and capture exact output/hash. If unavailable, report the blocker rather than substitute syntax parsing for a build.
2. Compare and visually verify the cinematic facade and rooftop batches on the downtown Johnny Cake Hill → waterfront route, matching the mobile baseline quality preset.
3. Check the seven 003A fixes (camera wall clipping, Bethel safe spawn, GIS duplicate exclusion, pedestrian avoidance, sidewalk normals/materials, clapboard textures, touch HUD) against real gameplay behavior.
4. Improve walk/run/turn animation and vehicle/camera traversal, then implement road-connected navigation with actual route topology.
5. Test an isolated candidate on actual iPhone Safari, recording FPS, p95, draw calls, triangle count, quality/device and save/restore. No >15% sustained frame-time regression without approval.

## Communication protocol
Give one concise progress report here with `[Verified]`, `[Reported]`, `[Blocked]` or `[Planned]`, the changed files and source/build SHA. Never claim deployment, production acceptance or a passing full build without fresh evidence. This document is a status ledger, not an invitation for separate agents or duplicate implementation.
