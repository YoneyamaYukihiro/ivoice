export type Section = {
  title: string;
  body: string;
};

export function parseSections(text: string): Section[] {
  const sections: Section[] = [];
  let title = "";
  let bodyLines: string[] = [];

  const flush = () => {
    const body = bodyLines.join("\n").trim();
    if (body) sections.push({ title, body });
  };

  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^[#＃]\s*(\S.*)$/);
    if (m) {
      flush();
      title = m[1].trim();
      bodyLines = [];
    } else {
      bodyLines.push(line);
    }
  }
  flush();
  return sections;
}
