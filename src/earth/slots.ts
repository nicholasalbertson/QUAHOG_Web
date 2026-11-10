// Three earth save slots. The active slot is also written to the single
// earth-local key so Continue on the title still works.

import type { EarthLocalSave } from "./earthLocal";

export const SLOT_COUNT = 3;
export const SLOT_KEY = "mh.earth.slots.v1";

export interface SlotFile {
  active: number;
  slots: (EarthLocalSave | null)[];
}

export function emptySlots(): SlotFile {
  return { active: 0, slots: [null, null, null] };
}

export function parseSlots(raw: unknown): SlotFile {
  const file = emptySlots();
  if (!raw || typeof raw !== "object") return file;
  const rec = raw as Partial<SlotFile>;
  if (typeof rec.active === "number" && rec.active >= 0 && rec.active < SLOT_COUNT) file.active = Math.floor(rec.active);
  if (Array.isArray(rec.slots)) {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = rec.slots[i];
      file.slots[i] = slot && typeof slot === "object" ? slot as EarthLocalSave : null;
    }
  }
  return file;
}

export function withActive(file: SlotFile, index: number, save: EarthLocalSave): SlotFile {
  const next = parseSlots(file);
  const i = Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor(index)));
  next.slots[i] = save;
  next.active = i;
  return next;
}

export function activeSave(file: SlotFile): EarthLocalSave | null {
  return file.slots[file.active] ?? null;
}
