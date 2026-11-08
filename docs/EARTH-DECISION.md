# Earth build decision record (§2.11 / R1)

**Date:** 2026-11-07
**Decision (original):** Demote `earth.html` to **diagnostic / photoreal preview** for the Mount Hope release path. The stylized canvas remains the sole playable product boot.

## Rationale (original demotion)

1. The stylized build already owns the shared sim layer (`SimBootstrap`, RoadGraph, PedGraph, MissionRuntime, SaveGame). Duplicating that stack into earth diverges permanently (risk R1).
2. Earth depends on Google 3D Tiles auth/quota with no fallback ground — known void failure mode on iPhone.
3. Shipping one playable loop (stylized) unblocks SaveGame, missions, heat, and content without waiting on tile stability.

## Consequences (original)

- Earth keeps existing tile viewer + actors for diagnostics; no requirement to wire missions/wanted/economy into earth before M8.
- Shared modules under `src/sim/` may still be imported by earth later if a future decision reverses this.
- Start menu photoreal link remains available and labeled as diagnostic.

## Revisit triggers (original)

- Google tile auth/fallback ground (§2.10) lands and a real-device soak is green.
- Product explicitly prioritizes photoreal as the primary play mode.

---

## REVERSAL — 2026-11-07 23:20 EST (Nic's tap)

**New decision:** Revive `earth.html` as a **full playable mode**. This reverses
the demotion above. The earth build is now on the release path as a second
playable mode, not a diagnostic preview.

**Scope:** implement §2.1–§2.10 + §2.8 (stability, idle/pause, auth overlays,
locomotion, HUD parity, vehicles, peds, gameplay loop [missions/wanted/
economy/persistence], environment, fallbacks) plus §2.11 docs/measurement.

**Architecture (R1 mitigation, binding):** use the **shared sim layer** — both
builds boot from the same SimBootstrap/RoadGraph/PedGraph/MissionRuntime/
SaveGame (§2.11.4). Do NOT duplicate the sim stack into earth; that was the
divergence risk the demotion was avoiding. If a §2 item requires duplicating
sim logic, flag it instead of duplicating.

**Status:** §2 is UNBLOCKED and in progress (2026-11-07). The demotion is
superseded; do not treat §2 as diagnostic or closed.
