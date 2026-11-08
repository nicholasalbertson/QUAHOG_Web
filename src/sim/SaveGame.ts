/**
 * §1.5 Unified SaveGame — versioned blob with migration + Continue gate.
 * Domains: stats, economy, mission, position, settings, scrimshaw, inventory,
 * weapons, waypoint, clock/weather, radio, race bests, boat (optional).
 */

import { loadJSON, saveJSON, removeItem, getItem } from "../storage";
import { SAVE_KEYS } from "../registries";

export const SCHEMA_VERSION = 2 as const;

export interface SaveBlobV2 {
  schemaVersion: 2;
  createdAt: number;
  build: string;
  stats?: { cash: number; health: number; police: number; faction: number };
  economy?: Record<string, true>;
  mission?: { mi: number; step: number; done: boolean };
  position?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  scrimshaw?: number;
  inventory?: { pistol: number; shotgun: number };
  weapons?: { weapon: string; melee: string; armed: boolean };
  waypoint?: { x: number; z: number } | null;
  clockWeather?: { day: number; hour: number; weather: string };
  radio?: { station: string };
  raceBests?: Record<string, number>;
  boat?: { x: number; y: number; z: number; yaw: number } | null;
  carDamage?: number;
}

export interface ContinueGate {
  ok: boolean;
  reason?: string;
}

/** Required keys for Continue — stats + position; mission is preferred but
 *  optional so legacy live-lineage saves (pre-mission key) still resume. */
export function canContinue(): ContinueGate {
  const stats = getItem(SAVE_KEYS.stats);
  const pos = getItem(SAVE_KEYS.pos);
  const mission = getItem(SAVE_KEYS.mission);
  if (!stats) return { ok: false, reason: "missing stats" };
  if (!pos) return { ok: false, reason: "missing position" };
  try {
    const p = JSON.parse(pos) as Record<string, unknown>;
    if (typeof p.px !== "number" && typeof p.carx !== "number" && typeof p.boatx !== "number") {
      return { ok: false, reason: "position incomplete" };
    }
    if (mission) {
      const m = JSON.parse(mission) as Record<string, unknown>;
      if (typeof m.mi !== "number" || typeof m.step !== "number") {
        return { ok: false, reason: "mission incomplete" };
      }
    }
  } catch {
    return { ok: false, reason: "corrupt save" };
  }
  return { ok: true };
}

/** Assemble a V2 blob from currently-scattered localStorage keys. */
export function collectLegacySave(): SaveBlobV2 {
  const blob: SaveBlobV2 = {
    schemaVersion: 2,
    createdAt: Date.now(),
    build: "mounthope",
  };
  blob.stats = loadJSON(SAVE_KEYS.stats, undefined);
  blob.economy = loadJSON(SAVE_KEYS.economy, undefined);
  blob.mission = loadJSON(SAVE_KEYS.mission, undefined);
  blob.position = loadJSON(SAVE_KEYS.pos, undefined);
  blob.settings = loadJSON(SAVE_KEYS.settings, undefined);
  blob.scrimshaw = loadJSON(SAVE_KEYS.scrimshaw, undefined);
  blob.inventory = loadJSON(SAVE_KEYS.inventory, undefined);
  blob.radio = loadJSON(SAVE_KEYS.radio, undefined);
  blob.raceBests = loadJSON(SAVE_KEYS.raceBests, undefined);
  // Boat / carDamage piggy-back on the position record when present.
  const pos = blob.position as
    | {
        boatx?: number; boaty?: number; boatz?: number; boatYaw?: number;
        carDamage?: number;
      }
    | undefined;
  if (pos && typeof pos.boatx === "number") {
    blob.boat = {
      x: pos.boatx,
      y: typeof pos.boaty === "number" ? pos.boaty : 1.2,
      z: typeof pos.boatz === "number" ? pos.boatz : 0,
      yaw: typeof pos.boatYaw === "number" ? pos.boatYaw : 0,
    };
  }
  if (pos && typeof pos.carDamage === "number") blob.carDamage = pos.carDamage;
  return blob;
}

export function saveUnified(partial?: Partial<SaveBlobV2>): SaveBlobV2 {
  const blob: SaveBlobV2 = {
    ...collectLegacySave(),
    ...partial,
    schemaVersion: 2,
    createdAt: Date.now(),
    build: "mounthope",
  };
  // Size budget soft assert
  const raw = JSON.stringify(blob);
  if (raw.length > 256 * 1024) {
    console.warn("[SaveGame] blob exceeds 256KB soft budget", raw.length);
  }
  // Atomic-ish: write temp then main
  saveJSON(SAVE_KEYS.saveV2 + ".tmp", blob);
  saveJSON(SAVE_KEYS.saveV2, blob);
  removeItem(SAVE_KEYS.saveV2 + ".tmp");
  return blob;
}

export function loadUnified(): SaveBlobV2 | null {
  const v2 = loadJSON<SaveBlobV2 | null>(SAVE_KEYS.saveV2, null);
  if (v2 && v2.schemaVersion === 2) return v2;
  // Migrate: synthesize from legacy keys if Continue would work
  if (!canContinue().ok) return null;
  const migrated = collectLegacySave();
  saveJSON(SAVE_KEYS.saveV2, migrated);
  return migrated;
}

/** Wipe every known save domain (New Game). */
export function clearAllSaves(): void {
  removeItem(
    SAVE_KEYS.stats,
    SAVE_KEYS.economy,
    SAVE_KEYS.scrimshaw,
    SAVE_KEYS.pos,
    SAVE_KEYS.mission,
    SAVE_KEYS.inventory,
    SAVE_KEYS.radio,
    SAVE_KEYS.raceBests,
    SAVE_KEYS.saveV2,
    SAVE_KEYS.saveV2 + ".tmp",
  );
}

/** Validate a blob; returns error strings (empty = ok). */
export function validateSave(blob: unknown): string[] {
  const errs: string[] = [];
  if (!blob || typeof blob !== "object") return ["not an object"];
  const b = blob as SaveBlobV2 & { schemaVersion?: number };
  if (typeof b.schemaVersion !== "number") errs.push("schemaVersion missing");
  else if (b.schemaVersion > SCHEMA_VERSION) {
    // §1.5.8 Unknown future version → refuse load.
    errs.push(`future schemaVersion ${b.schemaVersion} (max ${SCHEMA_VERSION})`);
  } else if (b.schemaVersion !== 2) {
    errs.push(`unsupported schemaVersion ${String(b.schemaVersion)}`);
  }
  if (b.stats) {
    for (const k of ["cash", "health", "police", "faction"] as const) {
      if (typeof b.stats[k] !== "number" || !Number.isFinite(b.stats[k])) errs.push(`stats.${k}`);
    }
  }
  // §1.5.3 Size budget assert.
  try {
    if (JSON.stringify(b).length > 256 * 1024) errs.push("size exceeds 256KB budget");
  } catch {
    errs.push("not serializable");
  }
  return errs;
}

/** §1.5.8 Refuse load helper for recovery UI. */
export function refuseFutureSave(blob: unknown): { ok: false; reason: string } | { ok: true; blob: SaveBlobV2 } {
  const errs = validateSave(blob);
  if (errs.length) return { ok: false, reason: errs[0] };
  return { ok: true, blob: blob as SaveBlobV2 };
}

/** §1.5.9 Lightweight checksum (not crypto — detects corruption). */
export function checksumSave(raw: string): string {
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** §1.5.9 Pack with checksum (compression deferred — size already < 256KB). */
export function packSave(blob: SaveBlobV2): { payload: string; checksum: string } {
  const payload = JSON.stringify(blob);
  return { payload, checksum: checksumSave(payload) };
}

export function unpackSave(packed: { payload: string; checksum: string }): SaveBlobV2 | null {
  if (checksumSave(packed.payload) !== packed.checksum) return null;
  try {
    const blob = JSON.parse(packed.payload) as SaveBlobV2;
    if (validateSave(blob).length) return null;
    return blob;
  } catch {
    return null;
  }
}

/** §1.5.12 Export/import JSON for debug. */
export function exportSaveJson(): string {
  const blob = loadUnified() ?? collectLegacySave();
  const packed = packSave(blob);
  return JSON.stringify(packed, null, 2);
}

export function importSaveJson(raw: string): { ok: boolean; reason?: string } {
  try {
    const packed = JSON.parse(raw) as { payload?: string; checksum?: string } | SaveBlobV2;
    let blob: SaveBlobV2 | null = null;
    if (packed && typeof packed === "object" && "payload" in packed && packed.payload && packed.checksum) {
      blob = unpackSave({ payload: packed.payload, checksum: packed.checksum });
      if (!blob) return { ok: false, reason: "checksum mismatch" };
    } else {
      const errs = validateSave(packed);
      if (errs.length) return { ok: false, reason: errs[0] };
      blob = packed as SaveBlobV2;
    }
    saveUnified(blob);
    return { ok: true };
  } catch {
    return { ok: false, reason: "parse fail" };
  }
}

let lastQuicksaveAt = 0;
const QUICKSAVE_COOLDOWN_MS = 4000;

/** §1.5.14 Quicksave with cooldown. */
export function quicksave(partial?: Partial<SaveBlobV2>): { ok: boolean; reason?: string } {
  const now = Date.now();
  if (now - lastQuicksaveAt < QUICKSAVE_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }
  lastQuicksaveAt = now;
  saveUnified(partial);
  return { ok: true };
}

/** §1.5.13 Autosave throttle — blocked during cutscene/chase spike/loading. */
export function mayAutosave(flags: { cutscene?: boolean; chaseSpike?: boolean; loading?: boolean }): boolean {
  if (flags.cutscene || flags.chaseSpike || flags.loading) return false;
  return true;
}

/** §1.5.16 Cloud sync decision — local-only for browser MVP. */
export const CLOUD_SYNC_DECISION =
  "Local-only (localStorage). Cloud sync deferred until account auth exists; no silent remote overwrite.";
