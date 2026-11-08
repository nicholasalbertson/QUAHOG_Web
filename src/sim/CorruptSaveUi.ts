/**
 * §11.4.1 Corrupt-save recovery UI model (discard/export/retry).
 */

export type CorruptAction = "discard" | "export" | "retry";

export interface CorruptSavePrompt {
  slot: string;
  message: string;
  actions: CorruptAction[];
}

export function corruptSavePrompt(slot: string, reason: string): CorruptSavePrompt {
  return {
    slot,
    message: `Save "${slot}" looks corrupt (${reason}). Discard, export a copy, or retry load.`,
    actions: ["discard", "export", "retry"],
  };
}

export function applyCorruptAction(
  action: CorruptAction,
  store: { getItem(k: string): string | null; removeItem(k: string): void; setItem(k: string, v: string): void },
  slotKey: string,
): { ok: boolean; exported?: string } {
  if (action === "discard") {
    store.removeItem(slotKey);
    return { ok: true };
  }
  if (action === "export") {
    const raw = store.getItem(slotKey) ?? "";
    store.setItem(slotKey + ".export", raw);
    return { ok: true, exported: raw };
  }
  // retry — no mutation
  return { ok: true };
}
