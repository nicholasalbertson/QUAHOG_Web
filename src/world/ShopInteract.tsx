/**
 * §4.4 Shop counter — nearest shop prompt + purchase on KeyE / B.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { consumeTap } from "../input";
import { shared } from "../shared";
import { useGame, useToasts } from "../store";
import { useStats } from "../game";
import { useInventory } from "../inventory";
import { sfx } from "../audio/sfx";
import { nearestShop, applyPurchase, canPurchase, SHOPS } from "../sim/ShopCatalog";
import { prompts } from "../sim/InteractPrompt";

export function ShopInteract() {
  const nearId = useRef<string | null>(null);

  useFrame(() => {
    if (useGame.getState().paused || !useGame.getState().started) return;
    if (useGame.getState().mode !== "foot") {
      if (nearId.current) {
        prompts.remove(`shop:${nearId.current}`);
        nearId.current = null;
      }
      return;
    }
    const t = shared.player?.translation();
    if (!t) return;
    const shop = nearestShop(t.x, t.z, 4);
    if (shop?.id !== nearId.current) {
      if (nearId.current) prompts.remove(`shop:${nearId.current}`);
      nearId.current = shop?.id ?? null;
      if (shop) {
        prompts.upsert({
          id: `shop:${shop.id}`,
          kind: "shop",
          label: `${shop.name} · E buy`,
          priority: 5,
          x: shop.x,
          z: shop.z,
          radius: 4,
        });
      }
    }
    if (!shop) return;
    // Don't steal enter-vehicle KeyE when a car is closer.
    if (useGame.getState().nearCar) return;
    if (!consumeTap("KeyE")) return;
    // Prefer first affordable ammo/weapon item.
    const st = useStats.getState();
    const item = shop.items.find((it) =>
      canPurchase(it, { cash: st.cash, wanted: st.police, missionsDone: [] }).ok,
    );
    if (!item) {
      useToasts.getState().push("Can't buy here right now", "#ff6a6a");
      return;
    }
    const inv = useInventory.getState();
    const result = applyPurchase(item, {
      cash: st.cash,
      pistol: inv.pistol,
      shotgun: inv.shotgun,
    });
    if (!result.ok) {
      useToasts.getState().push("Not enough cash", "#ff6a6a");
      return;
    }
    st.addCash(result.bag.cash - st.cash); // delta (may be negative)
    // applyPurchase already subtracted; sync inventory deltas
    if (typeof result.bag.pistol === "number") {
      const d = result.bag.pistol - inv.pistol;
      if (d > 0) inv.add("pistol", d);
    }
    if (typeof result.bag.shotgun === "number") {
      const d = result.bag.shotgun - inv.shotgun;
      if (d > 0) inv.add("shotgun", d);
    }
    if (result.bag.weapon === "pistol" || result.bag.weapon === "shotgun") {
      useGame.getState().setWeapon(result.bag.weapon);
      if (!useGame.getState().armed) useGame.getState().toggleArmed();
      inv.add(result.bag.weapon, 12);
    }
    inv.save();
    useToasts.getState().push(`Bought ${item.name}`, "#7CFC00");
    sfx.cash();
    void SHOPS;
  });

  return null;
}
