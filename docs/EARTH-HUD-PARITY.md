# Earth HUD parity (§2.5)

Shared HUD lives in stylized `src/HUD.tsx` + `src/ui/**`. Earth build should reuse:

| Element | Shared source | Earth status |
|---------|---------------|--------------|
| Minimap / big map | HUD map panel | Wire shared component (§2.5.1) |
| Compass | `sim/Compass` | Logic ready; mount in earth HUD |
| Health / damage | `sim/DamageIndicator` | Logic ready |
| Wanted stars | heat tier / WantedRadar | Logic ready |
| Interact prompts | `sim/InteractPrompt` | Logic ready |
| Mission markers | MissionRuntime + ObjectiveNav | Logic ready |

Documented omissions for earth until tile budget allows: photo mode chrome, radio scrubber detail, race splits strip.
