# Definition of done gates (§ checklist footer)

Process gates for every PR touching sim/content:

1. Header comment names fixed-step vs render-rate when touching GameLoop (§1.1.23)
2. New persisted field → migration entry (§1.5)
3. New manifest field → validator + lint (§1.6)
4. New feature → ≥1 automated test in §15 suite
5. New per-frame system → §1.11 telemetry attribution
6. New asset → license entry (§13.5 / `assets-licenses.json`)
7. New UI surface → a11y label (§10.4)
8. New mission → MissionRuntime ownership (§1.3)
9. New string → externalized key (§16)
10. No `Math.random` in `src/sim` (`check:sim-rng`)
11. No per-frame allocation in hot paths (VecPool / Perf-safe)
12. Prefer no `any` in `src/sim`
13. Deterministic under replay where applicable
14. Risky features behind flags (§0.2)
15. Commit messages reference task IDs (`feat(§1.1.7): …`)
