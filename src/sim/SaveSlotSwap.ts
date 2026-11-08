/**
 * §11.4.5 Corrupt payload never bricks; multi-slot swaps cleanly.
 */

export function swapSlots(
  store: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void },
  a: string,
  b: string,
): void {
  const va = store.getItem(a);
  const vb = store.getItem(b);
  if (vb == null) store.removeItem(a);
  else store.setItem(a, vb);
  if (va == null) store.removeItem(b);
  else store.setItem(b, va);
}

export function safeLoadSlot(
  store: { getItem(k: string): string | null },
  key: string,
): { ok: boolean; data?: unknown; reason?: string } {
  const raw = store.getItem(key);
  if (raw == null) return { ok: false, reason: "missing" };
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}
