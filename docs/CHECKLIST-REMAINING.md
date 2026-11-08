# Checklist remaining (v3.4 snapshot)

Canonical tracker: [`IMPLEMENTATION-CHECKLIST-V3.md`](./IMPLEMENTATION-CHECKLIST-V3.md).

## Counts (approx)

| Status | Count |
|--------|------:|
| Done `[x]` | ~220 |
| Partial `[~]` | ~90 |
| Open `[ ]` | ~375 |

## Content-blocked (cannot finish in code alone)

- **§7.3 Cape/FR authored tiles** — GIS/art authoring gate; blocks mid/late campaign geography, FR collectibles, distant business markers.
- **§2 Photoreal / DEM / Earth** — demoted to diagnostic (`EARTH-DECISION.md`); no rewrite.
- **§15 device FPS matrix** — needs measured Device A/B/C soaks.
- **§16–§17 localization + release** — copy, store assets, legal, marketing.
- **§0.1 full CI/Storybook/pre-commit** — tooling policy; partial (typecheck + sim-rng + assets:audit exist).

## Code-landed this deepen (v3.4)

Also: `checklistMatrix.test.ts` covers §1.1.T1/T5, §1.2.T4–T7, §1.3.T1–T4,
§1.4.T1/T4, §1.5.T2/T5/T6. Stuck despawn uses cumulative `stuckTotal`.

## Code-landed this deepen (v3.4)

PedGraph cost / crosswalk FSM / door TTL / residency; Mission conditions + authoring + checkpoints; HeatAxes; FactionTerritory; BoatDynamics; CombatStub; RaceStub; DialogueStub; SignalFsm; WastedBusted; AdaptiveMusic; Accessibility; Save pack/export/quicksave; lightning + duck; Economy upgrades/sell/unlocks; WorldManifest fronts/races/collectibles.

## Next autonomous batches

1. Wire SignalNetwork into StreetLife + PedestrianAI walk windows.
2. Wire HeatAxes + WastedBusted into GameSystems / Player.
3. Race HUD + bests persistence; shop interiors prompts.
4. §1.1.T / soak automated hashes where feasible without devices.
5. Keep marking truthful `[x]`/`[~]`/`Blocked` as code lands.
