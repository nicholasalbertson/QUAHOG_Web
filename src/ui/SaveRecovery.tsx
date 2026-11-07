import { useMemo, useState } from "react";
import { loadJSON, removeItem } from "../storage";
import { SAVE_KEYS } from "../registries";
import {
  hasRecoverableTmp,
  recoverFromTmp,
  type SaveBlobV2,
} from "../sim/SaveGame";
import { useGame } from "../store";
import { sfx } from "../audio/sfx";

/** §11.4 — recover from atomic .tmp if main save is corrupt. */
export function SaveRecovery() {
  const started = useGame((s) => s.started);
  const [dismissed, setDismissed] = useState(false);

  const issue = useMemo(() => {
    if (!hasRecoverableTmp()) return null;
    return loadJSON<SaveBlobV2 | null>(SAVE_KEYS.saveV2 + ".tmp", null);
  }, []);

  if (started || dismissed || !issue) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 72,
        zIndex: 45,
        margin: "0 auto",
        maxWidth: 480,
        background: "#1a1520",
        border: "1px solid #a06070",
        borderRadius: 8,
        padding: "14px 16px",
        color: "#f2e8ea",
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Save recovery</div>
      <div style={{ opacity: 0.85, marginBottom: 12 }}>
        A backup save was found after an interrupted write. Restore it, export JSON, or discard.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            recoverFromTmp();
            sfx.ui();
            setDismissed(true);
            location.reload();
          }}
        >
          Restore
        </button>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([JSON.stringify(issue, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "mounthope-save-recovery.json";
            a.click();
            sfx.ui();
          }}
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => {
            removeItem(SAVE_KEYS.saveV2 + ".tmp");
            sfx.ui();
            setDismissed(true);
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}

/** Helper for tests / StartMenu. */
export function peekRecoveryBlob(): SaveBlobV2 | null {
  return loadJSON<SaveBlobV2 | null>(SAVE_KEYS.saveV2 + ".tmp", null);
}
