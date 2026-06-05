const STRUCTURAL_PUNCT = /[：:、，,（）()「」｛｝\[\]【】]/;

export function cleanupForReading(input: string): string {
  let text = input;

  text = text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  text = text.replace(/__([^_\n]+)__/g, "$1");
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1");

  text = text.replace(/^#{2,}\s+/gm, "# ");

  text = text.replace(/^[\-*]\s+/gm, "");

  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const prevTrimmed = i > 0 ? lines[i - 1].trim() : "";
    const nextTrimmed = i + 1 < lines.length ? lines[i + 1].trim() : "";
    const couldBeHeader =
      trimmed.length > 0 &&
      trimmed.length <= 14 &&
      !STRUCTURAL_PUNCT.test(trimmed) &&
      !trimmed.startsWith("#") &&
      prevTrimmed === "" &&
      nextTrimmed === "";
    if (couldBeHeader) {
      result.push(`# ${trimmed}`);
    } else {
      result.push(line);
    }
  }

  const collapsed: string[] = [];
  let prevBlank = false;
  for (const l of result) {
    const isBlank = l.trim() === "";
    if (isBlank && prevBlank) continue;
    collapsed.push(l);
    prevBlank = isBlank;
  }

  return collapsed.join("\n").trim();
}
