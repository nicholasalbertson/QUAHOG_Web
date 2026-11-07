# Mount Hope — Implementation Checklist

Canonical tracked backlog. Prefer the deep-expansion task IDs (`§S.E.T`) in
commits and PRs.

- **Primary (v3 deep expansion):** [`IMPLEMENTATION-CHECKLIST-V3.md`](./IMPLEMENTATION-CHECKLIST-V3.md)
- **Expanded (v2 with Accept/Dep):** [`IMPLEMENTATION-CHECKLIST-EXPANDED.md`](./IMPLEMENTATION-CHECKLIST-EXPANDED.md)

Status: `[ ]` not started · `[~]` partial · `[x]` done

## Done baseline (sim layer)

- [x] `RoadGraph` + Dijkstra + `ObjectiveNav`
- [x] `CameraRig` + occlusion pull-in
- [x] `WorldStreamer` load/evict + `evictUnwanted`
- [x] Quality NPC caps + shadow map size
- [x] `VehicleDynamics` + `VehicleState`
- [x] `TrafficDirector` / `ChaseController` / `PedestrianAI`
- [x] `PedGraph` baseline sidewalk corridors (deepen per §1.2)
- [x] `MissionRuntime` baseline fail/retry/abandon + ownership (deepen per §1.3)
- [x] Mission step persistence (`mounthope.mission.v1`)

## Priority implementation order (active)

1. [x] Close streamer evict/dispose + quality NPC/shadow caps
2. [~] **§0 Foundations** — flags, `Rng`, telemetry, registries; `assets:audit` landed (CI wire-up TBD)
3. [x] **§1.1 GameLoop** — core + heat/economy/traffic/peds/car/boat on fixed step
4. [~] §1.2 PedGraph baseline (deepen doors/crosswalks later)
5. [~] §1.3 MissionRuntime baseline
6. [~] §1.6 WorldManifest scaffold (from slice); Cape/FR content still open
7. [~] §1.5 SaveGame v2 + Continue gate + inventory + boat/carDamage domains
8. [x] §3.2 heat tiers + §5.2 ammo/inventory persistence
9. [x] §2.11 earth demoted to diagnostic (`docs/EARTH-DECISION.md`)
10. [~] §1.4 ClockWeather + fog→streamer radius; §9.2 spatial audio stub
11. [~] §15 AcceptanceHarness stages 0–7 green; §17 release checklist drafted
12. [ ] §7.3 Cape/FR authored tiles — **blocked** (see `CONTENT-CAPE-FR.md`) ← remaining content gate for full campaign
    - also done this pass: boat-aware mission/waypoint targets; police soft-fail chase; SpatialIndex segment/LOS; streamer metrics; tab Canvas pause

See V3 for full contracts, test matrices, and the dependency DAG.

## Top 30 progress

Quick status for the `FullStackAssets/top15-improvements-d5da` pass (items 1–15 + 16–30).

### 1–15

1. [x] Mission fail/retry/abandon UX (`MissionFailOverlay`, `useMission.fail/retry/abandon`)
2. [x] Heat escalation (`HeatResponse.tsx` heli / roadblock stubs)
3. [x] PedGraph crosswalks + doors (`stitchCrosswalks`, `addDoorNodes`)
4. [~] Car/boat fixed-step via `sim.loop` (+ boat wet friction in 18)
5. [x] `DRESSING_ENABLED` quality budgets (`DRESSING_BUDGETS` / `clampDressingCount`)
6. [x] District seam auto-switch (`DistrictSeam.tsx`)
7. [x] Corridor scaffolding (`content/corridor.ts`, `CorridorGuide.tsx`)
8. [x] SaveGame recovery UI (`SaveRecovery.tsx`)
9. [x] FPS/soak harness + `SoakBadge` + FPS-MATRIX note
10. [x] Wanted UX / lose-heat zones (`LoseHeatZone.tsx`)
11. [x] Combat weapon wheel (`WeaponWheel.tsx`)
12. [x] Spatial audio siren / listener (HeatResponse + SimBootstrap; muffling in 29)
13. [x] Safehouse / Hospital interior stubs
14. [x] CI workflow scaffold (`.github/workflows/ci.yml`)
15. [x] Radio lines + `docs/LEGAL-AUDIO.md`

### 16–30

16. [x] Dialogue stub (`DialogueBox` / `defineDialogue` + Bethel proximity once/mission)
17. [x] Objective `timedFailSec` + MissionRunner fail on exceed
18. [x] Boat friction/wet via `sim.clock.friction`
19. [x] Race bests HUD toast from `SAVE_KEYS.raceBests`
20. [x] Traffic yield / soft-brake (`TrafficDirector` + StreetLife stopZones)
21. [x] Night streetlight boost (`NightLights.tsx` near CORE)
22. [x] LOD fade stub comment + quality-0 `viewRadius`
23. [x] Accessibility `reducedMotion` store flag + PauseMenu + skip shake
24. [x] Tutorial tips once (`mounthope.tutorial.v1` toasts)
25. [x] Audio bus master/sfx/radio on PauseMenu
26. [x] PWA basics (`manifest.webmanifest` + theme-color already present)
27. [x] Signal FSM stub (`SignalFsm.ts` + unit test)
28. [x] Corpse TTL 45s / cap 8 in StreetLife
29. [x] Spatial occlusion `playAt({ muffled })` halves frequency
30. [x] Replay digest `sim.rngDigest()` + AcceptanceHarness stage 8
