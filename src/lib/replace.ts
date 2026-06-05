import type { DictionaryEntry } from "./dictionary";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function applyDictionary(
  text: string,
  entries: DictionaryEntry[],
): string {
  if (!entries.length) return text;
  const sorted = [...entries].sort(
    (a, b) => b.surface.length - a.surface.length,
  );
  let result = text;
  for (const e of sorted) {
    result = result.replace(new RegExp(escapeRegExp(e.surface), "g"), e.reading);
  }
  return result;
}
