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

export function updateMember(
  members: Member[],
  id: string,
  patch: Partial<Pick<Member, "surface" | "reading" | "honorific">>,
): Member[] {
  return members.map((m) => (m.id === id ? { ...m, ...patch } : m));
}

export function parseImportedMembers(json: string): Member[] | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(
      (m): m is { surface: string; reading: string; honorific?: string; isSelf?: boolean } =>
        typeof m?.surface === "string" && typeof m?.reading === "string",
    );
    let anySelf = false;
    const out: Member[] = valid.map((m) => {
      const honorific = isHonorific(m.honorific) ? m.honorific : "さん";
      const isSelf = Boolean(m.isSelf) && !anySelf;
      if (isSelf) anySelf = true;
      return {
        id: newId(),
        surface: m.surface,
        reading: m.reading,
        honorific,
        isSelf,
      };
    });
    return out;
  } catch {
    return null;
  }
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
