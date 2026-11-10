import type { CSSProperties } from "react";
import { BUILD_LINKS, type BootIntent } from "./intent";

// First screen for both pages. No three.js, no city slice, no map tiles.
// Play loads that build. The other build is a normal link, same weight.

const shell: CSSProperties = {
  position: "fixed", inset: 0, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", textAlign: "center",
  background: "radial-gradient(ellipse at 50% 40%, #1f363e, #09181f)",
  color: "#e9e8df", fontFamily: "Georgia, serif",
};

const row: CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 28,
};

function choice(primary: boolean): CSSProperties {
  return {
    padding: "14px 28px", fontFamily: "system-ui, sans-serif", fontSize: 16, fontWeight: 700,
    letterSpacing: 1, cursor: "pointer", borderRadius: 10, textDecoration: "none",
    border: primary ? "none" : "1px solid #2c6a8e",
    color: primary ? "#1a1304" : "#9fe0ff",
    background: primary ? "#d2b782" : "rgba(20,40,60,.7)",
  };
}

export function BootTitle({ app, onPlay }: { app: "earth" | "street"; onPlay: (intent: BootIntent) => void }) {
  const other = app === "earth" ? BUILD_LINKS.street : BUILD_LINKS.earth;
  let saved = false;
  try {
    saved = app === "earth"
      ? !!localStorage.getItem("mh.earthLocal.v1")
      : !!localStorage.getItem("mounthope.save.v1") || !!localStorage.getItem("mounthope.pos.v1");
  } catch { /* private mode */ }
  return (
    <div id="boot-title" style={shell}>
      <div style={{ fontSize: 13, letterSpacing: 8, color: "#d2b782" }}>SOUTHCOAST</div>
      <h1 style={{ fontSize: "clamp(36px, 7vw, 72px)", margin: "8px 0", letterSpacing: 4 }}>The Narrows</h1>
      <p style={{ opacity: 0.75, margin: 0 }}>Fall River, New Bedford, Brockton, Cape Cod</p>
      <div style={row}>
        {saved && (
          <button style={choice(true)} onClick={() => onPlay(app === "earth" ? "earth-continue" : "street-continue")}>
            Continue
          </button>
        )}
        <button id="boot-play" style={choice(!saved)} onClick={() => onPlay(app === "earth" ? "earth-new" : "street-new")}>
          {app === "earth" ? "Play 3D Tiles" : "Play street map"}
        </button>
        <a id="boot-other" href={other.href} style={choice(false)}>{other.label}</a>
      </div>
      <p style={{ marginTop: 22, fontSize: 12, opacity: 0.6, fontFamily: "system-ui, sans-serif" }}>
        The city loads after you play. Both builds stay on this screen.
      </p>
    </div>
  );
}
