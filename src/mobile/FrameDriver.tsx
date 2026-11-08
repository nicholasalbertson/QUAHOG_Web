import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useGame } from "../store";
import { FrameClock, mobileBudget } from "./profile";
import { advanceIdle, IDLE_PAUSE_MS } from "../earth/frameLoop";
import { isDown, moveAxis } from "../input";

// Frame pacing for the stylized build (Canvas frameloop="never").
// §12.5.1: the loop stops entirely when the tab is hidden (visibilitychange
// cancels the rAF; it restarts on return — no catch-up, the clock suspends).
// §12.5.2: after IDLE_PAUSE_MS (8 s) with no input, a running game drops to
// the 12 fps idle rate instead of the full quality rate, so a settled view
// stops burning battery while the world keeps animating slowly. Any input
// wakes it back to full rate immediately. Held input (driving with W held)
// counts as active — idle only accrues when nothing is held or pressed.
function inputHeld(): boolean {
  const axis = moveAxis();
  if (axis.x !== 0 || axis.y !== 0) return true;
  return isDown("ShiftLeft") || isDown("ShiftRight") || isDown("Space") || isDown("KeyE") || isDown("KeyF");
}

export function FrameDriver() {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const clock = new FrameClock();
    let raf = 0;
    let alive = true;
    let idleMs = 0;
    let last = performance.now();
    const wake = () => { idleMs = 0; last = performance.now(); };
    const tick = (now: number) => {
      if (!alive || document.hidden) return;
      const g = useGame.getState();
      idleMs = advanceIdle(idleMs, now - last, inputHeld());
      last = now;
      const idle = g.started && !g.paused && idleMs >= IDLE_PAUSE_MS;
      const fps = g.paused || !g.started || idle ? 12 : mobileBudget(g.quality).fps;
      const time = clock.next(now, fps);
      if (time !== null) advance(time, true);
      raf = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(raf); clock.suspend();
      if (!document.hidden) { wake(); raf = requestAnimationFrame(tick); }
    };
    window.addEventListener("keydown", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("touchstart", wake, { passive: true });
    window.addEventListener("wheel", wake, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("wheel", wake);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [advance]);
  return null;
}
