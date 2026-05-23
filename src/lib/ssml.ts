export type SsmlOptions = {
  voice: string;
  lang?: string;
  rate?: string;
  pitch?: string;
  style?: string;
};

const DEFAULTS: Required<Omit<SsmlOptions, "voice" | "style">> = {
  lang: "ja-JP",
  rate: "+0%",
  pitch: "+0%",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSsml(text: string, options: SsmlOptions): string {
  const lang = options.lang ?? DEFAULTS.lang;
  const rate = options.rate ?? DEFAULTS.rate;
  const pitch = options.pitch ?? DEFAULTS.pitch;
  const safe = escapeXml(text);
  const prosody = `<prosody rate="${rate}" pitch="${pitch}">${safe}</prosody>`;
  const voiceInner = options.style
    ? `<mstts:express-as style="${options.style}">${prosody}</mstts:express-as>`
    : prosody;
  return [
    `<speak version="1.0" xml:lang="${lang}" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts">`,
    `  <voice name="${options.voice}">${voiceInner}</voice>`,
    `</speak>`,
  ].join("\n");
}
