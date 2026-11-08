/**
 * §9.1 Door/UI / ped VO / impact / weapon SFX key catalogs (packs TBD).
 */

export const DOOR_UI_SFX = [
  "ui.click",
  "ui.back",
  "door.open",
  "door.close",
  "door.locked",
] as const;

export const PED_VO_BARKS = {
  greeting: ["ped.hi", "ped.yo"],
  panic: ["ped.scream", "ped.watch_out"],
  hit: ["ped.ouch", "ped.grunt"],
} as const;

export type ImpactMaterial = "metal" | "wood" | "flesh" | "concrete" | "glass";
export type ImpactIntensity = "light" | "medium" | "heavy";

export function impactSfx(mat: ImpactMaterial, intensity: ImpactIntensity): string {
  return `impact.${mat}.${intensity}`;
}

export const WEAPON_SFX: Record<string, { fire: string; reload: string; empty: string }> = {
  pistol: { fire: "wpn.pistol.fire", reload: "wpn.pistol.reload", empty: "wpn.pistol.empty" },
  shotgun: { fire: "wpn.shotgun.fire", reload: "wpn.shotgun.reload", empty: "wpn.shotgun.empty" },
  bat: { fire: "wpn.bat.swing", reload: "wpn.bat.whoosh", empty: "wpn.bat.whoosh" },
  fists: { fire: "wpn.fists.hit", reload: "wpn.fists.whoosh", empty: "wpn.fists.whoosh" },
};

export function assertSfxCatalog(): string[] {
  const errs: string[] = [];
  if (DOOR_UI_SFX.length < 3) errs.push("door/ui sparse");
  if (PED_VO_BARKS.greeting.length < 1) errs.push("greeting empty");
  for (const mat of ["metal", "wood", "flesh", "concrete", "glass"] as ImpactMaterial[]) {
    for (const i of ["light", "medium", "heavy"] as ImpactIntensity[]) {
      if (!impactSfx(mat, i).startsWith("impact.")) errs.push(`${mat}.${i}`);
    }
  }
  return errs;
}
