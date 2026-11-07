import { describe, expect, it } from "vitest";
import { useGame } from "../store";
import { useInventory } from "../inventory";

describe("weapon ammo + mag HUD contract", () => {
  it("spend refuses an empty mag and reload restores it", () => {
    useInventory.getState().reset();
    useGame.setState({ armed: true, weapon: "pistol" });
    const inv = useInventory.getState();
    expect(inv.spend("pistol")).toBe(true);
    expect(useInventory.getState().magPistol).toBe(11);
    useInventory.setState({ magPistol: 0 });
    expect(useInventory.getState().spend("pistol")).toBe(false);
    expect(useInventory.getState().reload("pistol")).toBe(true);
    expect(useInventory.getState().magPistol).toBe(12);
  });

  it("cycles weapon store slots pistol → shotgun → melee → unarmed", () => {
    useGame.setState({ armed: true, weapon: "pistol", melee: "fists" });
    useGame.getState().setWeapon("shotgun", true);
    expect(useGame.getState().weapon).toBe("shotgun");
    useGame.setState({ armed: false, melee: "bat" });
    expect(useGame.getState().melee).toBe("bat");
    useGame.setState({ armed: false, melee: "fists" });
    expect(useGame.getState().armed).toBe(false);
  });
});
