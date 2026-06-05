import type { Member } from "./members";

const KNOWN_HONORIFICS = ["さん", "くん", "君", "様", "ちゃん", "氏"];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function applyMembers(text: string, members: Member[]): string {
  if (!members.length) return text;
  const sorted = [...members].sort(
    (a, b) => b.surface.length - a.surface.length,
  );
  let result = text;
  for (const m of sorted) {
    const pattern = new RegExp(
      `${escapeRegExp(m.surface)}(${KNOWN_HONORIFICS.join("|")})?`,
      "g",
    );
    result = result.replace(pattern, (_match, foundHonorific) => {
      const honorific =
        foundHonorific !== undefined ? foundHonorific : m.honorific;
      return m.reading + honorific;
    });
  }
  return result;
}
