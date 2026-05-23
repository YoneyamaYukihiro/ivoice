import { buildSsml, type SsmlOptions } from "@/lib/ssml";

export type SpeechConfig = {
  key: string;
  region: string;
  voice: string;
};

export type SynthesizeResult = {
  audio: ArrayBuffer;
  contentType: string;
  ssml: string;
};

const OUTPUT_FORMAT = "audio-24khz-160kbitrate-mono-mp3";
const OUTPUT_CONTENT_TYPE = "audio/mpeg";

export class SpeechConfigError extends Error {}
export class SpeechSynthesisError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message);
  }
}

export function loadSpeechConfig(): SpeechConfig {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION ?? "japaneast";
  const voice = process.env.AZURE_SPEECH_VOICE ?? "ja-JP-NanamiNeural";
  if (!key) {
    throw new SpeechConfigError(
      "AZURE_SPEECH_KEY is not set. Configure .env.local from .env.example.",
    );
  }
  return { key, region, voice };
}

export async function synthesize(
  text: string,
  config: SpeechConfig,
  ssmlOverrides?: Partial<SsmlOptions>,
): Promise<SynthesizeResult> {
  const ssml = buildSsml(text, {
    voice: config.voice,
    ...ssmlOverrides,
  });

  const endpoint = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
      "User-Agent": "ivoice-shikai-kun",
    },
    body: ssml,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new SpeechSynthesisError(
      `Azure Speech synthesis failed: ${res.status} ${res.statusText}`,
      res.status,
      body,
    );
  }

  const audio = await res.arrayBuffer();
  return { audio, contentType: OUTPUT_CONTENT_TYPE, ssml };
}
