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
  /** Why Continue is refused (only when !ok). */
  reason?: string;
  /** Which domains the restore will actually bring back (only when ok). */
  restores?: { position: boolean; stats: boolean; mission: boolean };
  /** Player-facing degradations: Continue works, but a domain falls back. */
  notes?: string[];
}

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

type Probe = "absent" | "usable" | "unusable";

function probe(key: string, usable: (o: Record<string, unknown>) => boolean): { state: Probe; parsed: boolean } {
  const raw = getItem(key);
  if (!raw) return { state: "absent", parsed: false };
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return { state: "unusable", parsed: false };
    return { state: usable(o as Record<string, unknown>) ? "usable" : "unusable", parsed: true };
  } catch {
    return { state: "unusable", parsed: false };
  }
}

/**
 * THE Continue acceptance contract (2026-11-09). Single authority for the
 * title menu (StartMenu), the schema-2 migration (loadUnified) and the
 * acceptance harness. It mirrors what the live restore actually does
 * (GameSystems applyRestore / restoreMissionProgress / useStats.load), which
 * is tolerant per domain — so the gate is too:
 *
 * 1. A game "was started" iff a position key or a well-formed mission key
 *    exists. Both are only ever written after Play. The stats key alone is
 *    NOT evidence (it could be written by the title screen) → "no saved game".
 * 2. Given that evidence, Continue is offered when at least one domain is
 *    usable. Every other domain degrades instead of blocking:
 *      position unusable → resume at the district spawn (note),
 *      stats absent/unusable → default stats,
 *      mission malformed → campaign start (note).
 *    Hiding Continue over one bad domain would leave New Game — which wipes
 *    everything — as the only button.
 * 3. Evidence present but nothing usable → refused as "corrupt save".
 * 4. The gate only reads. It never deletes or rewrites a save.
 */
export function canContinue(): ContinueGate {
  const stats = probe(SAVE_KEYS.stats, () => true);
  const pos = probe(
    SAVE_KEYS.pos,
    (p) => (fin(p.px) && fin(p.pz)) || (fin(p.carx) && fin(p.carz)) || fin(p.boatx),
  );
  const mission = probe(SAVE_KEYS.mission, (m) => fin(m.mi) && fin(m.step));

  const started = pos.state !== "absent" || mission.state === "usable";
  if (!started) {
    if (mission.state === "unusable") return { ok: false, reason: "corrupt save" };
    return { ok: false, reason: stats.state === "absent" ? "no saved game" : "missing position" };
  }
  const restores = {
    position: pos.state === "usable",
    stats: stats.state === "usable",
    mission: mission.state === "usable",
  };
  // A parsed-but-coordinate-less position record is what savePos() writes
  // before the physics bodies exist: a real (very short) session.
  const anything = restores.position || restores.stats || restores.mission || pos.parsed;
  if (!anything) return { ok: false, reason: "corrupt save" };
  const notes: string[] = [];
  if (!restores.position) notes.push("position unreadable — resuming at the district spawn");
  if (mission.state === "unusable") notes.push("mission progress unreadable — campaign restarts");
  if (stats.state === "unusable") notes.push("stats unreadable — default cash and health");
  return { ok: true, restores, notes };
}

export const AUTOSAVE_INTERVAL_MS = 20000;

/** Wall-clock autosave gate. Never fires on the title screen (a save written
 *  there is a phantom "Continue" for a game nobody started); fires on the
 *  first started frame when lastMs is -Infinity. */
export function autosaveDue(a: { started: boolean; nowMs: number; lastMs: number; intervalMs?: number }): boolean {
  if (!a.started) return false;
  return a.nowMs - a.lastMs > (a.intervalMs ?? AUTOSAVE_INTERVAL_MS);
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
  blob.weapons = loadJSON(SAVE_KEYS.weapons, undefined);
  blob.waypoint = loadJSON(SAVE_KEYS.waypoint, undefined);
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
  // Domain mirrors for weapons / waypoint (§11.2.4–5).
  if (blob.weapons) saveJSON(SAVE_KEYS.weapons, blob.weapons);
  if (blob.waypoint !== undefined) saveJSON(SAVE_KEYS.waypoint, blob.waypoint);
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
    SAVE_KEYS.weapons,
    SAVE_KEYS.waypoint,
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
    // §1.5.2 Field-level range validators.
    if (typeof b.stats.cash === "number" && b.stats.cash < 0) errs.push("stats.cash range");
    if (typeof b.stats.health === "number" && (b.stats.health < 0 || b.stats.health > 100)) {
      errs.push("stats.health range");
    }
    if (typeof b.stats.police === "number" && (b.stats.police < 0 || b.stats.police > 5)) {
      errs.push("stats.police range");
    }
  }
  if (b.weapons) {
    if (typeof b.weapons.armed !== "boolean") errs.push("weapons.armed");
    if (typeof b.weapons.weapon !== "string") errs.push("weapons.weapon");
  }
  if (b.waypoint != null) {
    if (typeof b.waypoint.x !== "number" || typeof b.waypoint.z !== "number") errs.push("waypoint");
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

/** §1.5.11 Classify corrupt / schema / checksum failures. */
export type CorruptKind = "parse" | "schema" | "checksum" | "ok";

export function detectCorruptSave(raw: string, checksum?: string): CorruptKind {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "parse";
  }
  if (checksum != null && checksumSave(raw) !== checksum) return "checksum";
  const errs = validateSave(parsed);
  if (errs.length) return "schema";
  return "ok";
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
