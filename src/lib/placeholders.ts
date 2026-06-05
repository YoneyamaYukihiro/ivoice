const PATTERN = /\{([^{}\s]+)\}/g;

export function extractPlaceholders(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(PATTERN)) {
    set.add(m[1]);
  }
  return Array.from(set);
}

export function applyPlaceholders(
  text: string,
  values: Record<string, string>,
  filter?: (key: string) => boolean,
): string {
  return text.replace(PATTERN, (whole, key) => {
    if (filter && !filter(key)) return whole;
    const v = values[key];
    return v && v.length > 0 ? v : "";
  });
}

export function defaultValueFor(key: string): string {
  const now = new Date();
  switch (key) {
    case "date":
    case "today":
      return `${now.getMonth() + 1}月${now.getDate()}日`;
    case "date_full":
      return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    case "time":
      return `${now.getHours()}時${now.getMinutes()}分`;
    case "weekday": {
      const days = ["日", "月", "火", "水", "木", "金", "土"];
      return `${days[now.getDay()]}曜日`;
    }
    default:
      return "";
  }
}

export const BUILTIN_KEYS = ["date", "today", "date_full", "time", "weekday"];

export const PERSON_KEYS = ["presenter", "担当者"];

export function isTextareaPlaceholder(key: string): boolean {
  return /予定|本文|内容|一言|コメント|schedule|content|comment/i.test(key);
}
