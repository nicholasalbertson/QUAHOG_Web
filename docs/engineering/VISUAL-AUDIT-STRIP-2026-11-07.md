# Visual audit — stripped baseline (2026-11-07)

**Branch:** `FullStackAssets/strip-dressing-visual-audit-d5da`  
**Review shots:** `?review=bethel-front|bethel-side|mariners-home|water-street|blizzard`  
**Intent:** Dirt roads + excess dressing (trees, awnings, street signs, stop lights, GLB accents, AreaTrees, PortClutter) are **off**. Audit what remains and list exact changes.

## What this pass already changed

| Change | Status |
|--------|--------|
| Dirt / gravel / track ribbons → asphalt | Done (`classifyRoadSurface`, `Roads.tsx`) |
| `DRESSING_ENABLED = false` | Done |
| Trees, awnings, street signs, traffic lights, foliage, fences, billboards, dumpsters, Props, GlbStreetDressing, GlbHarborDressing, AreaTrees, PortClutter | Gated off |
| Cobble allowlist (Johnny Cake Hill / OSM sett) | Kept |
| Harbor banks, roads, sidewalks, parked cars, StreetLife, utility poles, crosswalks, steeples, marina | Still on |

## Live review observations (clean world, no character modal)

Captured via browser at the five review cameras after closing overlays.

### Shared
- No trees / awnings / street signs / stop lights visible — strip succeeded.
- No dirt-brown road ribbons — strip succeeded.
- Streets feel empty: parked cars and pedestrians often not visible at these fixed cameras (spawn/stream radius or culling).
- Building quality is **inconsistent**: photoreal / textured heroes next to flat GIS boxes.
- Ground is mostly flat green / flat gray; aerial imagery often missing in constrained capture.
- Sky/lighting overcast and flat; blizzard shot did **not** show snow at camera.

### Per shot
| Shot | Seen | Worst gaps |
|------|------|------------|
| bethel-front | Beige box building, flat green ground, no road surface read | Bethel massing wrong / underspecified; no curb/road |
| bethel-side | Mix of detailed pink facade + church steeple + gray placeholders | Quality mismatch; parking paint only |
| mariners-home | Brick-ish masses + steeples, gray road plane | Still boxy blocks; sparse curb language |
| water-street | Best — brick facades, yellow lane dashes, sidewalks, harbor water, “Double Bank Building” label | Landmark still massing; no boats at this frustum |
| blizzard | Same as bethel-front; **no snow** | Review weather not applied / snow not in view |

## Exact change list (do next — do **not** re-add clutter dressing)

### P0 — must change

1. **Unify building material language**  
   GIS extrusions still read as solid beige/gray boxes with flat window quads.  
   **Change:** Apply production facade maps (`quahog-assets/production-facades`) + district materials to **all** streamed buildings in the NB core; ensure clapboard/brick/industrial variants by highway/landuse, not one flat color.

2. **Fix Seamen’s Bethel hero massing at `bethel-front` / `blizzard` cameras**  
   Review eye sits on a generic box, not the authored Bethel.  
   **Change:** Confirm `SeamensBethel` mount + stream radius at Johnny Cake Hill; match review targets in `visualReview.ts` to the live Bethel origin.

3. **Make asphalt / curb / sidewalk readable without dressing**  
   Water-street has dashes + sidewalk; Bethel shots do not.  
   **Change:** Ensure road ribbons + sidewalk aprons draw under review cameras; verify Poly Haven asphalt upgrade actually binds when quality ≥ Medium; keep cobble **only** on Johnny Cake Hill / OSM sett.

4. **Blizzard review must show snow**  
   `?review=blizzard` was visually identical to clear.  
   **Change:** Force `weather: "snow"` + snow particles / winter road maps when `reviewShot() === "blizzard"` (DayNight already pins hour; weather is missing).

5. **Character cast previews**  
   Lizzie / Remington are cube/slab placeholders; Franklin/Dockhand thumbs show “GLB” text.  
   **Change:** Ship preview PNGs for every `CHARACTER_MODELS` entry; keep in-world Borden procedural until human GLBs exist (already documented).

### P1 — high leverage, still no clutter trees/signs

6. **Populate streets with life that is already allowed**  
   Parked cars + StreetLife are ungated but invisible at review cams.  
   **Change:** Verify hub spawn near Johnny Cake Hill; raise parked density in core; ensure ped graph sidewalk spawns within 80 m of Bethel.

7. **Harbor read at water-street**  
   Water plane OK; working waterfront still thin.  
   **Change:** Keep HarborProps pilings/buoys/boats (already ungated); tune camera so pier craft are in frustum; do **not** re-enable PortClutter boxes.

8. **Landmark labels vs massing**  
   Floating “Double Bank Building” / “16 m” markers sit on weak geometry.  
   **Change:** Prefer tier1 / NbTier1 GLBs for labeled heroes; hide label when a hero mesh is mounted within radius.

9. **Ground fallback when aerial fails**  
   Flat green reads as unfinished.  
   **Change:** Stronger procedural ground (district grass / pavement albedo from Poly Haven sand/plank only where appropriate) when Esri tiles abort.

### P2 — polish after P0/P1

10. Window materials (specular / interior hint) on GIS facades.  
11. Roof typology variation (gable / flat / monitor) on extrusions.  
12. Time-of-day / sky dome quality (overcast gray is uniform).  
13. Optional: selective **pack011** hydrants/benches only on Water St + Johnny Cake Hill — not city-wide dressing.

## Explicit non-goals (this audit)

- Do **not** flip `DRESSING_ENABLED` back on city-wide.  
- Do **not** restore dirt-road materials.  
- Do **not** scatter Kenney nature trees / awnings / stop lights everywhere.

## Implementation status (2026-11-07 follow-up)

| Item | Status |
|------|--------|
| P0 GIS production facades on `Buildings.tsx` | Done |
| P0 Bethel review camera → landmark origin | Done |
| P0 Cobble streets get apron + sidewalk | Done |
| P0 Character preview PNGs (Franklin + Dockhand) | Done |
| P0 Blizzard review weather | Done (prior commit) |
| P1 Parked/ped Medium budgets + tighter curb spacing | Done |
| P1 Harbor boat density | Done |
| P1 Hide labels for NB tier1 / Bethel / Mariners Home | Done |
| P1 Urban ground fallback plate under NB core | Done |

## Artifacts

Screenshots under `/opt/cursor/artifacts/visual-audit-2026-11-07/` (review + browser captures).
