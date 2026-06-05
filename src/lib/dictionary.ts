export type DictionaryEntry = {
  id: string;
  surface: string;
  reading: string;
};

const STORAGE_KEY = "voice-reader.dictionary";

export function loadDictionary(): DictionaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is DictionaryEntry =>
        typeof e?.id === "string" &&
        typeof e?.surface === "string" &&
        typeof e?.reading === "string",
    );
  } catch {
    return [];
  }
}

export function saveDictionary(entries: DictionaryEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addEntry(
  entries: DictionaryEntry[],
  surface: string,
  reading: string,
): DictionaryEntry[] {
  const trimmedSurface = surface.trim();
  const trimmedReading = reading.trim();
  if (!trimmedSurface || !trimmedReading) return entries;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return [
    ...entries,
    { id, surface: trimmedSurface, reading: trimmedReading },
  ];
}

export function removeEntry(
  entries: DictionaryEntry[],
  id: string,
): DictionaryEntry[] {
  return entries.filter((e) => e.id !== id);
}
