export type TranscriptLine = {
  id: string;
  meetingId: string;
  speaker: string;
  text: string;
  at: number;
  confidence?: number;
};

type Store = Map<string, TranscriptLine[]>;

declare global {
  // eslint-disable-next-line no-var
  var __ivoiceTranscriptStore: Store | undefined;
}

function store(): Store {
  if (!globalThis.__ivoiceTranscriptStore) {
    globalThis.__ivoiceTranscriptStore = new Map();
  }
  return globalThis.__ivoiceTranscriptStore;
}

export function appendLine(line: TranscriptLine): void {
  const existing = store().get(line.meetingId) ?? [];
  existing.push(line);
  store().set(line.meetingId, existing);
}

export function getTranscript(meetingId: string): TranscriptLine[] {
  return store().get(meetingId) ?? [];
}

export function clearTranscript(meetingId: string): void {
  store().delete(meetingId);
}

export function transcriptToPlainText(lines: TranscriptLine[]): string {
  return lines
    .map((l) => {
      const ts = new Date(l.at).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return `[${ts}] ${l.speaker}: ${l.text}`;
    })
    .join("\n");
}
