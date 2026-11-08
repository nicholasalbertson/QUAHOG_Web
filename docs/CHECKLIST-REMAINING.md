# Checklist remaining (v3.4b snapshot)

Canonical tracker: [`IMPLEMENTATION-CHECKLIST-V3.md`](./IMPLEMENTATION-CHECKLIST-V3.md).

## Counts (approx)

| Status | Count |
|--------|------:|
| Done `[x]` | ~240 |
| Partial `[~]` | ~100 |
| Open `[ ]` | ~342 |

## Content-blocked (cannot finish in code alone)

- **§7.3 Cape/FR authored tiles** — GIS/art authoring gate; blocks mid/late campaign geography, FR collectibles, distant business markers. Marked CONTENT-BLOCKED in V3.
- **§2 Photoreal / DEM / Earth** — demoted to diagnostic (`EARTH-DECISION.md`); no rewrite.
- **§15 device FPS matrix** — needs measured Device A/B/C soaks.
- **§16–§17 localization + release** — copy, store assets, legal, marketing.
- **§0.1 full CI/Storybook/pre-commit** — tooling policy; partial (typecheck + sim-rng + assets:audit exist).
- **§9.1 audio asset packs** — need licensed samples wired into sfx (keys/maps landed).

## Code-landed this deepen (v3.4 / v3.4b)

PedGraph cost / crosswalk / door / residency / signal bind / stuckTotal; Mission conditions + authoring + checkpoints + beats; HeatAxes + WitnessLos + FactionTerritory + LoseHeatZones; BoatDynamics; CombatStub; RaceStub; DialogueStub; SignalFsm; shops/weapon-wheel/parking; TrafficAvoidance; Save pack/slots/export; lightning+duck; AdaptiveMusic; Accessibility; Economy upgrades; CarDamage; Tire/Powertrain; Footsteps; WantedRadar; RadioStations; MapLegend; WorldManifest fronts/races/collectibles.

Tests: `checklistV34.test.ts`, `checklistMatrix.test.ts`.

## Next autonomous batches

1. Wire new sim modules into StreetLife / GameSystems / HUD.
2. Deeper §1.9 vehicle (springs, ABS, weight transfer) + Rapier contacts.
3. §9.1 sample packs when assets exist; §10 HUD chrome binding.
4. Keep marking truthful `[x]`/`[~]`/`CONTENT-BLOCKED` as code lands.
