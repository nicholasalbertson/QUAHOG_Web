import { useMission } from "../mission";
import { useGame } from "../store";
import { useStats } from "../game";
import { sfx } from "../audio/sfx";

/** §8.5 — fail overlay with retry (checkpoint) and abandon. */
export function MissionFailOverlay() {
  const failed = useMission((s) => s.failed);
  const reason = useMission((s) => s.failReason);
  const title = useMission((s) => s.title);
  const paused = useGame((s) => s.paused);
  const started = useGame((s) => s.started);
  if (!started || !failed || paused) return null;

  const clearDown = () => {
    useGame.getState().setDown(null);
    if (useStats.getState().health <= 0) useStats.getState().setHealth(100);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(8,10,14,0.72)",
        fontFamily: "system-ui, sans-serif",
        color: "#f2f4f8",
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          padding: "28px 24px",
          background: "#141820",
          border: "1px solid #3a4558",
          borderRadius: 8,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: 2, color: "#ff8a8a", marginBottom: 8 }}>MISSION FAILED</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: "#b8c0cc", marginBottom: 22 }}>{reason ?? "Objective failed"}</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => {
              sfx.ui();
              clearDown();
              useMission.getState().retry();
            }}
            style={btnStyle("#ffcf4a", "#1a1408")}
          >
            Retry checkpoint
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.ui();
              clearDown();
              useMission.getState().abandon();
            }}
            style={btnStyle("#3a4558", "#f2f4f8")}
          >
            Abandon
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg: string, fg: string) {
  return {
    padding: "10px 16px",
    border: "none",
    borderRadius: 6,
    background: bg,
    color: fg,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  } as const;
}
