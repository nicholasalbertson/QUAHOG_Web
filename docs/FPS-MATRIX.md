# Named-device FPS matrix (§12.1 / §15.1.5)

Fill cells with measured values only. Do not invent numbers.

Devices are defined by checklist §12.1.1. Targets are the checklist budgets;
measured cells are filled only from a run on that actual device.

| Device | Tier | FPS p50 target | FPS p1 target | Mem target | Boot → playable (s) | Steady FPS (foot) | Steady FPS (drive) | Mem (measured) | Status |
|--------|------|----------------|---------------|------------|---------------------|-------------------|--------------------|----------------|--------|
| Device A (mid Android 2021) | mid | ≥ 50 | ≥ 30 | < 400 MB | _pending_ | _pending_ | _pending_ | _pending_ | Needs real Android device — none available in this environment |
| Device B (iPhone 12) | high | ≥ 55 | ≥ 40 | < 500 MB | _pending_ | _pending_ | _pending_ | _pending_ | Needs Nic's iPhone (retest device) |
| Device C (low Android 2019) | low | ≥ 30 | ≥ 20 | < 300 MB | _pending_ | _pending_ | _pending_ | _pending_ | Needs real Android device — none available in this environment |

## Desktop reference (headless, NOT a checklist device)

Measured 2026-11-07 ~23:11 EST against the live dist/ build (`main-CTp36z-b.js`,
a799527) in headless Chromium (Playwright, SwiftShader software rendering).
This row is a load/memory reference only — **FPS under SwiftShader is not
representative of any real device** and is not recorded as a device FPS.

| Metric | Value | Notes |
|--------|-------|-------|
| Boot → playable | 3.3 s | Navigation → NEW GAME clicked → game live (start-menu load + slice fetch) |
| Steady FPS (foot) | not measurable headless | rAF ran 4 frames in 94 s wall-clock under SwiftShader; the render loop is software-bound, not device-bound. Do not quote as a device FPS. |
| JS heap (foot, after boot) | 399.6 MB used / 459.7 MB total | `performance.memory`, headless Chromium. Heap, not device resident memory. |
| WebGL renderer | ANGLE / SwiftShader (software) | Confirms the FPS caveat above. |
| Spawn guard | tile-timeout fallback fired | Under SwiftShader the NB tile did not mount within the guard timeout; the guard fell back to the NB backstop spawn. This is a headless artifact, not a game bug. |
| 404s during boot | 10, all corridor overlays | `*-corridor.json` overlays (wood/rail/pier/parks/parking/islands/church/cemetery/beach/barrier) do not exist in dist/; overlays are optional, so these are expected absences, not failures. |
| Beacon POST | 501 from the static server | The debug beacon POSTs to the debug endpoint; the python static server has no POST route. Expected in this harness, not a game bug. |

## Soak companion (§ RELEASE Quality)

| Run | Duration | Peak resident (streamer debug) | Evict count | Result |
|-----|----------|--------------------------------|-------------|--------|
| Stream memory soak | 30 min drive loop | _pending_ | _pending_ | Needs a real device (or a GPU-backed headless run). The headless SwiftShader run cannot drive the loop at a meaningful frame rate, so its soak samples would not represent a real session. Use soak harness flags below. |

### Soak harness flags

Open the main game with:

```text
?debug&soak=1&perf=1
```

- `debug` — streamer / sim debug HUD lines
- `soak=1` — starts `SoakHarness` (5‑minute resident/evict samples to the console)
- `perf=1` — opt-in frame-time / draw-call overlay (`PerfProbe` / `RenderDiagnostics`)

Protocol: New Game → drive a loop across the NB tile ring for 30 minutes;
sample streamer resident MB + evict count every 5 minutes (console `[soak]` lines);
abort on OOM or sustained &lt; 20 FPS. Device measurement still owner/device gated.

### Headless measurement harness (this environment)

- Script: `~/workspace/fps-measure/probe.mjs` (Playwright-core + cached Chromium).
- Static server: `python3 -m http.server 8123` in `dist/` (serves the live build).
- Raw result: `~/workspace/fps-measure/probe-foot-60s.json` (2026-11-07 ~23:11 EST).
- Limitation: SwiftShader software rendering; FPS not measurable; boot + heap are.
- Probe v2 (2026-11-07): records per-minute FPS buckets (thermal drift),
  JS heap every 5 s + a linear slope (MB/min), and longtask counts — the
  §12.1.2 / §12.2.2 / §12.3.3 harness. Run it with `--seconds 1800 --mode
  drive` for a 30-min soak. Raw result: `~/workspace/fps-measure/probe-foot-30s-v2.json`
  (30 s smoke, 2026-11-07 — SwiftShader artifacts only: 3 frames in 45 s,
  heap 148.5 MB, 15 longtasks; the heap slope from 2 samples is meaningless
  and is NOT a leak signal).

## §12 status (2026-11-07)

| Item | Status | Evidence / blocker |
|------|--------|--------------------|
| 12.1.1 Named-device matrix | [x] committed | This file (devices + tiers + targets per §12.1.1). Measurements still pending. |
| 12.1.2 Thermal budget (20 min within 10% of p50) | needs real device | Harness landed: probe v2 buckets FPS per minute + reports first-5 vs last-5 median drift (`thermal.driftPct`, `within10Pct`). No device has run a 20-min soak yet — needs Nic's iPhone (B) or an Android (A/C). Matrix measured cells remain `_pending_` until Device A/B/C runs. |
| 12.1.3 Measured matrix | [~] partial | This file; desktop-reference row only. Device A/B/C still pending. |
| 12.2.1 JSON eviction → mesh GC on unmount | [x] verified | `StreamingBuildings` renders `<Tile key>` for active tiles only; on eviction React unmounts the tile → geometry disposed (`useEffect` cleanup) + camera buildings unregistered + `markTileUnmounted`. Intermediate part geometries disposed after merge. |
| 12.2.2 Heap flat across 30-min drive | needs real device | Harness landed: probe v2 samples heap every 5 s + reports a linear slope (MB/min). A flat heap is ~0 slope; a leak is a steady positive slope. The 30-min drive itself needs a real device (SwiftShader cannot drive at a meaningful rate). |
| 12.3.1 Allocation audit | [x] landed | Audit of all useFrame bodies (2026-11-07): 5 unconditional per-frame allocations found + fixed (Boat fwd/nfwd, FollowCamera first-person fwd, SkidMarks Euler, StreetLife ped steering, earth TileNpcs ped steering). Event-gated allocations (shooting, impacts, melee) are out of scope — they fire on input, not every frame. Guard: `src/__tests__/gcHygiene.test.ts` (6 tests). |
| 12.3.2 Reuse temp vectors/quats | [x] landed | Same fixes as 12.3.1 (module-level scratch vectors/quats/Euler). |
| 12.3.3 Zero minor-GC spikes > 8 ms during chase | needs real device | Harness landed: probe v2 records longtasks (>50 ms) as the proxy. Sub-50 ms minor-GC pauses have no JS API — they need a Chrome trace on a real device. |
| 12.5.1 Pause stylized Canvas when tab hidden | [x] pre-existing | `FrameDriver` cancels the rAF on `visibilitychange` and restarts it on return (clock suspends — no catch-up). Verified by code read 2026-11-07. |
| 12.5.2 Pause render loop on idle (§2.2) | [x] landed | `FrameDriver` drops a running game to the 12 fps idle rate after 8 s with no input (held input counts as active, so driving with W held never idles). Any input wakes it immediately. |
| 12.5.3 Hidden-tab CPU < 2% on Device A | needs real device | Mechanism landed (12.5.1 stops the loop when hidden); measurement needs Device A. |
