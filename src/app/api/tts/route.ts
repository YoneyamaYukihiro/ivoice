import { NextRequest, NextResponse } from "next/server";
import {
  loadSpeechConfig,
  SpeechConfigError,
  SpeechSynthesisError,
  synthesize,
} from "@/services/speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 5000;

type RequestBody = {
  text?: string;
  rate?: string;
  pitch?: string;
  style?: string;
};

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json(
      { error: "text is required" },
      { status: 400 },
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `text must be ${MAX_TEXT_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }

  let config;
  try {
    config = loadSpeechConfig();
  } catch (err) {
    if (err instanceof SpeechConfigError) {
      return NextResponse.json(
        { error: err.message, code: "speech_not_configured" },
        { status: 503 },
      );
    }
    throw err;
  }

  try {
    const { audio, contentType, ssml } = await synthesize(text, config, {
      rate: body.rate,
      pitch: body.pitch,
      style: body.style,
    });
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Ssml-Bytes": String(ssml.length),
      },
    });
  } catch (err) {
    if (err instanceof SpeechSynthesisError) {
      return NextResponse.json(
        {
          error: err.message,
          code: "speech_synthesis_failed",
          status: err.status,
          detail: err.body,
        },
        { status: 502 },
      );
    }
    throw err;
  }
}
