import { useEffect, useState } from "react";
import {
  readSoakSummary,
  soakActive,
  soakSnapshot,
  soakUrlEnabled,
  SOAK_STORAGE_KEY,
  type SoakSummary,
} from "../sim/SoakHarness";

/**
 * Compact soak status chip when `?soak=1`. Reads the auto-logged
 * `mounthope.soak.v1` summary so agents / device runs leave a durable trail.
 */
export function SoakBadge() {
  const [on] = useState(() => soakUrlEnabled());
  const [summary, setSummary] = useState<SoakSummary | null>(() => readSoakSummary());

  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => {
      setSummary(readSoakSummary() ?? {
        startedAt: soakSnapshot().startedAt,
        updatedAt: Date.now(),
        samples: soakSnapshot().samples.slice(),
        peakResidentBytes: soakSnapshot().samples.reduce((m, s) => Math.max(m, s.residentBytes), 0),
        lastEvictCount: soakSnapshot().samples.length
          ? soakSnapshot().samples[soakSnapshot().samples.length - 1].evictCount
          : 0,
        lastLoadFailures: soakSnapshot().samples.length
          ? soakSnapshot().samples[soakSnapshot().samples.length - 1].loadFailures
          : 0,
      });
    }, 1000);
    return () => clearInterval(id);
  }, [on]);

  if (!on) return null;

  const n = summary?.samples.length ?? 0;
  const peakMb = summary ? (summary.peakResidentBytes / 1e6).toFixed(1) : "—";
  const active = soakActive();

  return (
    <div
      title={`Soak auto-log → localStorage ${SOAK_STORAGE_KEY}`}
      style={{
        position: "fixed",
        top: 10,
        right: 12,
        zIndex: 45,
        pointerEvents: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        letterSpacing: 0.4,
        color: "#d7e6ff",
        background: "rgba(8,14,28,0.72)",
        border: "1px solid #3a5a9a",
        borderRadius: 6,
        padding: "6px 10px",
      }}
    >
      <strong style={{ color: active ? "#7ad9ff" : "#9ab" }}>SOAK</strong>
      {" · "}
      {n} smp · peak {peakMb} MB
      {summary ? ` · evict ${summary.lastEvictCount}` : ""}
    </div>
  );
}
