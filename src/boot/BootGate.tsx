import { useEffect, useState, type ComponentType } from "react";
import { BootTitle } from "./BootTitle";
import { stashBoot, type BootIntent } from "./intent";
import { registerAppShell } from "../pwa/register";

// The entry chunk is this gate. three.js, Rapier, and the city slice stay in
// the next chunk, requested only after Play.
export function BootGate({ app }: { app: "earth" | "street" }) {
  const [LoadedApp, setLoadedApp] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { registerAppShell(); }, []);

  const play = (intent: BootIntent) => {
    stashBoot(intent);
    const load = app === "earth"
      ? import("../earth/EarthApp").then((mod) => mod.EarthApp)
      : import("../App").then((mod) => mod.default);
    load.then((Comp) => setLoadedApp(() => Comp)).catch(() => setFailed(true));
  };

  if (failed) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#e7e0ff", background: "#05070d" }}>
        The game file did not load. Reload the page.
      </div>
    );
  }
  if (!LoadedApp) return <BootTitle app={app} onPlay={play} />;
  return <LoadedApp />;
}
