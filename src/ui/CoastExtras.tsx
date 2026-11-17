import { useEffect, useRef, useState } from "react";
import { acceptSide, sidePrompt, tickSide, type SidePrompt } from "../content/activities";
import { noteDiscovery } from "../content/discovery";
import { t, tf } from "../i18n/strings";
import { useStats } from "../game";
import { useToasts } from "../store";

export interface CoastPose {
  lat: number;
  lon: number;
  driving: boolean;
  paused: boolean;
}

// Fares, street races, and the discovery log. Both builds pass a pose.
export function CoastExtras({ pose }: { pose: () => CoastPose | null }) {
  const poseRef = useRef(pose);
  poseRef.current = pose;
  const [prompt, setPrompt] = useState<SidePrompt | null>(null);

  const accept = () => {
    const here = poseRef.current();
    if (!here || here.paused) return;
    acceptSide(here.lat, here.lon, here.driving);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyJ") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      accept();
    };
    window.addEventListener("keydown", onKey);
    const id = window.setInterval(() => {
      const here = poseRef.current();
      if (!here || here.paused) { setPrompt(null); return; }
      const found = noteDiscovery(here.lat, here.lon);
      for (const name of found) useToasts.getState().push(tf(t("coast", "found"), { name }), "#7ad9ff");
      for (const event of tickSide(here.lat, here.lon, here.driving, 0.25)) {
        if (event.type === "paid") {
          useStats.getState().addCash(event.cash);
          useToasts.getState().push(event.text, "#7CFC00");
        } else {
          useToasts.getState().push(event.text, "#ff8a8a");
        }
      }
      setPrompt(sidePrompt(here.lat, here.lon, here.driving));
    }, 250);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearInterval(id);
    };
  }, []);

  if (!prompt) return null;
  const label = prompt.kind === "fare-offer" ? tf(t("coast", "fareOffer"), { name: prompt.name })
    : prompt.kind === "race-offer" ? tf(t("coast", "raceOffer"), { name: prompt.name })
    : prompt.kind === "fare" ? tf(t("coast", "fareActive"), { name: prompt.name })
    : tf(t("coast", "raceActive"), { n: prompt.n });
  return (
    <div id="coast-offer" style={{ position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 18, pointerEvents: "auto" }}>
      <button
        type="button"
        onClick={accept}
        style={{
          background: "rgba(5,7,13,.88)", color: "#7ad9ff", border: "1px solid #2c3a5e",
          borderRadius: 8, padding: "8px 14px", font: "13px 'Courier New', monospace", cursor: "pointer",
        }}
      >
        {label} · {t("coast", "take")}
      </button>
    </div>
  );
}
