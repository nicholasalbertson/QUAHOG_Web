# Earth HUD parity mapping (§2.5.8)

Recorded 2026-11-07. Every stylized HUD element, its earth equivalent, or
its documented omission.

## Landed (earth equivalent exists)

| Stylized element | Earth equivalent | Source |
|------------------|------------------|--------|
| Minimap (radar) | Minimap mounted in the earth HUD (bottom-right) | Shared `src/Minimap.tsx` — earth passes its slice + a pose getter over `playState.player` |
| Compass | Cardinal + bearing in the earth HUD top bar | `src/world/compass.ts` (heading → bearing/cardinal) |
| Health | ♥ in the earth HUD top bar | Shared `useStats.health` |
| Wanted stars | ★/☆ in the earth HUD top bar | Shared `useStats.police` (reads 0 until §2.8.2/§3 give earth a heat source) |
| Cash | $ in the earth HUD top bar | Shared `useStats.cash` |
| Mission title + objective | Mission line in the earth HUD (title — objective · distance) | Shared `useMission` + `shared.navDist` (from EarthSimBridge) |
| Mission marker (3D beam + ring) | Same marker in earth, at the step target | `EarthMissionRunner` in `src/earth/EarthSimBridge.tsx` |
| Minimap route line | Same route line (road-following, same-district only) | Shared Minimap (reads `useMission` + the slice road graph) |
| Interact prompt | "E — Enter car" / "E — Exit car" in the earth HUD | `playState.player.carDist` / `driving` |
| Weather | Weather in the hint line + the earth sky/fog | Earth `weather` state (cycles clear/cloudy/rain) |
| Radio | Radio overlay (unchanged) | Earth `Radio` component |

## Omissions (documented, not hidden)

| Stylized element | Status in earth | Reason / unblock |
|------------------|-----------------|------------------|
| Big map (full-screen) | No earth equivalent | The stylized BigMap has no earth mount yet. Needs a big-map mount fed the earth slice + pose (same pattern as the Minimap). |
| Car damage meter | Not shown | The earth car has no damage model (`carDamage` is a stylized/SaveGame field). Needs an earth car-damage source (§2.6/§2.8). |
| Fronts / business panel | Not shown | Fronts are buyable in the stylized world UI; there is no earth front-purchase UI. Income still ticks (§2.8.3). |
| Scrimshaw / collectibles counter | Not shown | No earth collectibles yet (§7.2 scrimshaw is stylized-only so far). |
| Heat / wanted detail (beyond stars) | Stars only | No heat source in earth (§2.8.2/§3). |
| Police blips on the minimap | Drawn from `shared.cops` (empty in earth) | No cops in earth (§3.3). The Minimap reads the shared array, so blips appear automatically once cops exist. |
| HUD location label (street + town) | Not in earth | The stylized label reads the OSM road network from the slice; the earth equivalent needs the same lookup against the earth pose. |
| Photo mode chrome | Omitted | Until tile budget allows. |
| Radio scrubber detail | Omitted | Until tile budget allows. |
| Race splits strip | Omitted | Until tile budget allows. |

## Shared layer (§2.5.7)

The Minimap is now a shared component (both builds use `src/Minimap.tsx`).
The HUD shells are still separate (stylized `src/HUD.tsx` vs earth `Hud` in
`src/earth/EarthApp.tsx`) — a full shared HUD layer is §13.4 work.

Shared sim logic ready for earth mount: `sim/Compass`, `sim/DamageIndicator`,
`sim/InteractPrompt`, heat tier / WantedRadar, MissionRuntime + ObjectiveNav.
