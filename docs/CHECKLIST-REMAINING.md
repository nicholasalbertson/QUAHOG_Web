# Checklist remaining (v3.4c snapshot)

Canonical tracker: [`IMPLEMENTATION-CHECKLIST-V3.md`](./IMPLEMENTATION-CHECKLIST-V3.md).

PR: https://github.com/nicholasalbertson/QUAHOG_Web/pull/25

## Counts (approx)

| Status | Count |
|--------|------:|
| Done `[x]` | ~256 |
| Partial `[~]` | ~102 |
| Open `[ ]` | ~325 |

Started this deepen near ~500+ open after next-50; code-completable critical path largely stubbed/landed.

## Content-blocked (cannot finish in code alone)

- **§7.3 Cape/FR authored tiles** — GIS/art; marked CONTENT-BLOCKED in V3
- **§2 Photoreal / DEM / Earth** — diagnostic only (`EARTH-DECISION.md`)
- **§15 device FPS matrix** — needs measured Device A/B/C soaks
- **§16–§17 localization + release** — copy, store, legal, marketing
- **§0.1 full CI/Storybook/pre-commit** — policy/tooling; partial already
- **§9.1 audio sample packs** — licensed WAV/OGG assets (keys/maps exist)
- **§1.9.7 / §3.3.6 Rapier contacts** — needs physics integration pass in actors
- **§1.10.3–8 touch layout editor / safe-area** — UI chrome work
- **§8.1 11/11 mission content** — narrative authoring + §7.3 map

## Code-landed this deepen

See PR #25 body. Major modules under `src/sim/**` + economy deepen + SimBootstrap wiring (signals, lose-heat, thunder, duck).

## Tests

- `src/__tests__/sim/checklistV34.test.ts`
- `src/__tests__/sim/checklistMatrix.test.ts`
- `npm run check:sim-rng` clean
