# Checklist remaining (live)

Canonical: [`IMPLEMENTATION-CHECKLIST-V3.md`](./IMPLEMENTATION-CHECKLIST-V3.md) · PR [#25](https://github.com/nicholasalbertson/QUAHOG_Web/pull/25)

| Status | Count |
|--------|------:|
| Done `[x]` | ~465 |
| Partial `[~]` | ~212 |
| Open `[ ]` | ~55 |

**All remaining `[ ]` items are annotated blockers** (DEVICE / CONTENT / RAPIER-LIVE / PLAYTEST). No further code-only checklist IDs remain unmarked.

## Blocker classes

| Class | Examples |
|-------|----------|
| CONTENT-BLOCKED | §7.2–§7.3 tiles, §7.6/§7.8 art, §8.1 11/11 missions, anim meshes |
| DEVICE-BLOCKED | §12/§15 FPS, thermal, soaks, heap, golden screenshots |
| RAPIER-LIVE-BLOCKED | Broadphase / contact / cop collision in live actors |
| PLAYTEST-BLOCKED | Tutorial unaided, first-upgrade timing feel |

## Landed

Full code-feasible V3 surface in `src/sim/**`, CI workflow, editors, i18n seed, release ops, DoD gates, stability test suite (33+).
