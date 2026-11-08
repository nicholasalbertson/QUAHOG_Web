/**
 * §10.6.2 Language selection (catalog; packs TBD).
 */

export type LangId = "en" | "es" | "pt";

export const LANGUAGES: { id: LangId; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "pt", label: "Português" },
];

const KEY = "quahog.lang.v1";

export function loadLang(storage: Storage = localStorage): LangId {
  const v = storage.getItem(KEY);
  if (v === "en" || v === "es" || v === "pt") return v;
  return "en";
}

export function saveLang(id: LangId, storage: Storage = localStorage): void {
  storage.setItem(KEY, id);
}
