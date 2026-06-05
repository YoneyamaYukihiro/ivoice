export type Template = {
  id: string;
  name: string;
  text: string;
  updatedAt: number;
};

const STORAGE_KEY = "voice-reader.templates";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (t): t is Template =>
          typeof t?.id === "string" &&
          typeof t?.name === "string" &&
          typeof t?.text === "string" &&
          typeof t?.updatedAt === "number",
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveTemplates(templates: Template[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function upsertTemplate(
  templates: Template[],
  name: string,
  text: string,
): { next: Template[]; saved: Template } {
  const trimmedName = name.trim();
  const now = Date.now();
  const existing = templates.find((t) => t.name === trimmedName);
  if (existing) {
    const updated: Template = { ...existing, text, updatedAt: now };
    return {
      next: templates.map((t) => (t.id === existing.id ? updated : t)),
      saved: updated,
    };
  }
  const created: Template = {
    id: newId(),
    name: trimmedName,
    text,
    updatedAt: now,
  };
  return { next: [created, ...templates], saved: created };
}

export function removeTemplate(
  templates: Template[],
  id: string,
): Template[] {
  return templates.filter((t) => t.id !== id);
}

export function parseImportedTemplates(json: string): Template[] | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (t): t is { name: string; text: string; updatedAt?: number } =>
          typeof t?.name === "string" && typeof t?.text === "string",
      )
      .map((t) => ({
        id: newId(),
        name: t.name,
        text: t.text,
        updatedAt:
          typeof t.updatedAt === "number" && Number.isFinite(t.updatedAt)
            ? t.updatedAt
            : Date.now(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return null;
  }
}
