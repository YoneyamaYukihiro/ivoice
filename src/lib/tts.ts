export type Voice = {
  uri: string;
  name: string;
  lang: string;
};

export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listJapaneseVoices(): Promise<Voice[]> {
  return new Promise((resolve) => {
    if (!isSupported()) {
      resolve([]);
      return;
    }
    const collect = () =>
      window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.startsWith("ja"))
        .map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang }));

    const first = collect();
    if (first.length > 0) {
      resolve(first);
      return;
    }
    // Some browsers populate voices asynchronously.
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(collect());
    };
  });
}

export type SpeakOptions = {
  voiceURI?: string;
  rate?: number;
  onEnd?: () => void;
  onError?: (e: SpeechSynthesisErrorEvent) => void;
};

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = opts.rate ?? 1.0;
  if (opts.voiceURI) {
    const match = window.speechSynthesis
      .getVoices()
      .find((v) => v.voiceURI === opts.voiceURI);
    if (match) utter.voice = match;
  }
  if (opts.onEnd) utter.onend = opts.onEnd;
  if (opts.onError) utter.onerror = opts.onError;
  window.speechSynthesis.speak(utter);
}

export function pause(): void {
  if (isSupported()) window.speechSynthesis.pause();
}

export function resume(): void {
  if (isSupported()) window.speechSynthesis.resume();
}

export function stop(): void {
  if (isSupported()) window.speechSynthesis.cancel();
}
