# Checklist remaining (live)

Canonical: [`IMPLEMENTATION-CHECKLIST-V3.md`](./IMPLEMENTATION-CHECKLIST-V3.md) · PR [#25](https://github.com/nicholasalbertson/QUAHOG_Web/pull/25)

| Status | Count |
|--------|------:|
| Done `[x]` | ~414 |
| Partial `[~]` | ~188 |
| Open `[ ]` | ~130 |

Most remaining opens are CONTENT-BLOCKED (art/tiles/missions), device FPS/thermal, or release/l10n.

## Hard blockers

- §7.2–§7.3 / §7.6 / §7.8 art & authored tiles
- §8.1 11/11 mission content
- §15 device measurements
- §16–§17 l10n / store
- Rapier live contacts; audio sample binaries

## Infra landed

`.github/workflows/ci.yml` — typecheck, sim-rng, vitest sim, build + 30d artifacts.
