# Named-device FPS matrix (§12.1)

Fill cells with measured values only. Do not invent numbers.

| Device | Browser | Quality | Boot → playable (s) | Steady FPS (foot) | Steady FPS (drive) | Notes |
|--------|---------|---------|---------------------|-------------------|--------------------|-------|
| iPhone (A-class) | Safari | Low | _pending_ | _pending_ | _pending_ | |
| iPhone (A-class) | Safari | Medium | _pending_ | _pending_ | _pending_ | |
| Desktop reference | Chrome | High | _pending_ | _pending_ | _pending_ | |

## Soak companion (§ RELEASE Quality)

| Run | Duration | Peak resident (streamer debug) | Evict count | Result |
|-----|----------|--------------------------------|-------------|--------|
| Stream memory soak | 30 min drive loop | _pending_ | _pending_ | Use soak harness flags below |

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
