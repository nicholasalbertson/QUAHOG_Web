import { useEffect, useRef, useState } from "react";
import { useGame, type Weapon } from "../store";
import { useInventory } from "../inventory";
import { isDown } from "../input";
import { sfx } from "../audio/sfx";
import { recallSavedCar } from "../actors/recallCar";

type Slot = "pistol" | "shotgun" | "melee" | "unarmed";

const SLOTS: readonly Slot[] = ["pistol", "shotgun", "melee", "unarmed"];
const HOLD_MS = 220;
const CYCLE_MS = 380;

function applySlot(id: Slot): void {
  const g = useGame.getState();
  if (id === "unarmed") {
    useGame.setState({ armed: false, melee: "fists" });
  } else if (id === "melee") {
    useGame.setState({ armed: false, melee: "bat" });
  } else {
    g.setWeapon(id as Weapon, true);
    useGame.setState({ melee: "fists" });
  }
  sfx.ui();
}

function activeSlot(): Slot {
  const g = useGame.getState();
  if (g.armed) return g.weapon;
  if (g.melee === "bat") return "melee";
  return "unarmed";
}

/**
 * Hold KeyQ or Tab to cycle pistol → shotgun → melee → unarmed.
 * Short KeyQ tap still recalls the saved car.
 */
export function WeaponWheel() {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<Slot>("pistol");
  const started = useGame.getState().started;
  const [liveStarted, setLiveStarted] = useState(started);
  const holdStart = useRef(0);
  const lastCycle = useRef(0);
  const cycling = useRef(false);
  const qWasDown = useRef(false);
  const tabWasDown = useRef(false);

  useEffect(() => useGame.subscribe((s) => setLiveStarted(s.started)), []);

  useEffect(() => {
    if (!liveStarted) return;
    let raf = 0;
    const tick = () => {
      const qDown = isDown("KeyQ");
      const tabDown = isDown("Tab");
      const holding = qDown || tabDown;
      const now = performance.now();

      if (holding && holdStart.current === 0) {
        holdStart.current = now;
        lastCycle.current = 0;
        cycling.current = false;
      }

      if (holding && now - holdStart.current >= HOLD_MS) {
        if (!cycling.current) {
          cycling.current = true;
          const cur = activeSlot();
          const next = SLOTS[(SLOTS.indexOf(cur) + 1) % SLOTS.length];
          applySlot(next);
          setHighlight(next);
          lastCycle.current = now;
          setOpen(true);
        } else if (now - lastCycle.current >= CYCLE_MS) {
          const cur = activeSlot();
          const next = SLOTS[(SLOTS.indexOf(cur) + 1) % SLOTS.length];
          applySlot(next);
          setHighlight(next);
          lastCycle.current = now;
        }
        setOpen(true);
      }

      // Short KeyQ tap → recall saved car (Tab never recalls).
      if (qWasDown.current && !qDown) {
        const held = holdStart.current > 0 ? now - holdStart.current : 0;
        if (held > 0 && held < HOLD_MS && !cycling.current) recallSavedCar();
      }
      if (!holding) {
        holdStart.current = 0;
        cycling.current = false;
        setOpen(false);
      }

      qWasDown.current = qDown;
      tabWasDown.current = tabDown;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [liveStarted]);

  if (!liveStarted) return null;

  const labels: Record<Slot, string> = {
    pistol: "Pistol",
    shotgun: "Shotgun",
    melee: "Bat",
    unarmed: "Unarmed",
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {SLOTS.map((id) => (
              <div
                key={id}
                style={{
                  width: 110,
                  height: 72,
                  borderRadius: 8,
                  border: id === highlight ? "2px solid #ffcf4a" : "1px solid #445",
                  background: id === highlight ? "#2a2410" : "#161b24",
                  color: "#f2f4f8",
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {labels[id]}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Mag readout for HUD — pistol/shotgun when armed. */
export function useMagReadout(): string | null {
  const armed = useGame((s) => s.armed);
  const weapon = useGame((s) => s.weapon);
  const magP = useInventory((s) => s.magPistol);
  const magS = useInventory((s) => s.magShotgun);
  const resP = useInventory((s) => s.pistol);
  const resS = useInventory((s) => s.shotgun);
  if (!armed) return null;
  return weapon === "pistol" ? `${magP}/${resP}` : `${magS}/${resS}`;
}
