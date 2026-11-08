# Checklist remaining (live)

Canonical: [`IMPLEMENTATION-CHECKLIST-V3.md`](./IMPLEMENTATION-CHECKLIST-V3.md) · PR [#25](https://github.com/nicholasalbertson/QUAHOG_Web/pull/25)

| Status | Count |
|--------|------:|
| Done `[x]` | ~577 |
| Partial `[~]` | ~86 |
| Open `[ ]` | ~53 |

**All remaining `[ ]` items are annotated blockers** (DEVICE / CONTENT / RAPIER-LIVE / PLAYTEST). No further unmarked code-only checklist IDs.

Partials (`[~]`) still open are mostly earth-mount parity, live actor migration (car/boat fixed-step lineage), CI eslint dep install, art/sample packs, branding decision, or Cape/FR content — not unmarked code todos.

## Blocker classes

| Class | Examples |
|-------|----------|
| CONTENT-BLOCKED | §7.2–§7.3 tiles, §7.6/§7.8 art, §8.1 11/11 missions, anim meshes |
| DEVICE-BLOCKED | §12/§15 FPS, thermal, soaks, heap, golden screenshots |
| RAPIER-LIVE-BLOCKED | Broadphase / contact / cop collision in live actors |
| PLAYTEST-BLOCKED | Tutorial unaided, first-upgrade timing feel |

## Landed (latest)

v3.5 + v3.5b: race bests, HeatEscalation, Reload/Ammo, HUD flash/chip/reticle, FailReasons, MissionNavSync, TrafficDirector signals, SURFACE_FRICTION, 10k replay, radio align, mapProgressRows, OwnershipMissionGate, Shop applyPurchase, CorpseReaction, SunriseTables, a11y opacity/motion, weapons/waypoint save, boat accept test, ped LOD 30/80, chase empty-graph, surface SFX holes · NEXT50 50/50.
