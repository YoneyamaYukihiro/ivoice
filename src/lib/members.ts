export type Honorific = "さん" | "くん" | "様" | "";

export type Member = {
  id: string;
  surface: string;
  reading: string;
  honorific: Honorific;
  isSelf?: boolean;
};

const STORAGE_KEY = "voice-reader.members";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function loadMembers(): Member[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is Member =>
          typeof m?.id === "string" &&
          typeof m?.surface === "string" &&
          typeof m?.reading === "string" &&
          typeof m?.honorific === "string",
      )
      .map((m) => ({ ...m, isSelf: Boolean(m.isSelf) }));
  } catch {
    return [];
  }
}

export function saveMembers(members: Member[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

export function addMember(
  members: Member[],
  surface: string,
  reading: string,
  honorific: Honorific,
): Member[] {
  const s = surface.trim();
  const r = reading.trim();
  if (!s || !r) return members;
  return [
    ...members,
    { id: newId(), surface: s, reading: r, honorific },
  ];
}

export function removeMember(members: Member[], id: string): Member[] {
  return members.filter((m) => m.id !== id);
}

export function setSelf(members: Member[], id: string): Member[] {
  return members.map((m) => ({ ...m, isSelf: m.id === id }));
}

export function clearSelf(members: Member[]): Member[] {
  return members.map((m) => ({ ...m, isSelf: false }));
}

export function bulkAddFromCsv(
  members: Member[],
  csv: string,
  defaultHonorific: Honorific = "さん",
): { next: Member[]; added: number; skipped: number } {
  let added = 0;
  let skipped = 0;
  const next = [...members];
  for (const line of csv.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(",").map((p) => p.trim());
    const [surface, reading, honorificRaw] = parts;
    if (!surface || !reading) {
      skipped++;
      continue;
    }
    const honorific = isHonorific(honorificRaw)
      ? honorificRaw
      : defaultHonorific;
    next.push({ id: newId(), surface, reading, honorific });
    added++;
  }
  return { next, added, skipped };
}

function isHonorific(s: string | undefined): s is Honorific {
  return s === "さん" || s === "くん" || s === "様" || s === "";
}

export const HONORIFIC_OPTIONS: Honorific[] = ["さん", "くん", "様", ""];
