/**
 * §1.5.15 / §11.4 Save slot manager — single slot default; multi behind flag.
 */

import { loadJSON, saveJSON, removeItem } from "../storage";
import { SAVE_KEYS } from "../registries";
import {
  collectLegacySave,
  loadUnified,
  saveUnified,
  validateSave,
  type SaveBlobV2,
} from "./SaveGame";

export interface SaveSlotMeta {
  id: number;
  label: string;
  updatedAt: number;
  empty: boolean;
}

const SLOT_PREFIX = "mounthope.save.slot.";
const META_KEY = "mounthope.save.slots.meta";

export function slotKey(id: number): string {
  return SLOT_PREFIX + id;
}

export function listSlots(max = 1): SaveSlotMeta[] {
  const meta = loadJSON<SaveSlotMeta[]>(META_KEY, []);
  const out: SaveSlotMeta[] = [];
  for (let i = 0; i < max; i++) {
    const existing = meta.find((m) => m.id === i);
    const raw = loadJSON<SaveBlobV2 | null>(slotKey(i), null);
    out.push(
      existing ?? {
        id: i,
        label: i === 0 ? "Autosave" : `Slot ${i}`,
        updatedAt: raw?.createdAt ?? 0,
        empty: !raw,
      },
    );
    out[i].empty = !raw;
    if (raw) out[i].updatedAt = raw.createdAt;
  }
  return out;
}

export function writeSlot(id: number, blob?: Partial<SaveBlobV2>): SaveBlobV2 {
  const saved = { ...saveUnified(blob), ...blob, schemaVersion: 2 as const };
  saveJSON(slotKey(id), saved);
  const meta = listSlots(Math.max(id + 1, 1));
  meta[id] = {
    id,
    label: id === 0 ? "Autosave" : `Slot ${id}`,
    updatedAt: saved.createdAt,
    empty: false,
  };
  saveJSON(META_KEY, meta);
  // Keep canonical v2 in sync with slot 0.
  if (id === 0) saveJSON(SAVE_KEYS.saveV2, saved);
  return saved;
}

export function readSlot(id: number): SaveBlobV2 | null {
  const raw = loadJSON<SaveBlobV2 | null>(slotKey(id), null);
  if (raw && validateSave(raw).length === 0) return raw;
  if (id === 0) return loadUnified();
  return null;
}

export function clearSlot(id: number): void {
  removeItem(slotKey(id));
  const meta = listSlots(id + 1);
  if (meta[id]) meta[id].empty = true;
  saveJSON(META_KEY, meta);
}

/** Bootstrap slot 0 from legacy unified save if empty. */
export function ensurePrimarySlot(): SaveBlobV2 {
  const existing = readSlot(0);
  if (existing) return existing;
  const blob = collectLegacySave();
  return writeSlot(0, blob);
}
