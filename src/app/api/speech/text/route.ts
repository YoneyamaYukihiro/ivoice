import { NextRequest, NextResponse } from "next/server";
import {
  loadSpeechConfig,
  SpeechConfigError,
  SpeechSynthesisError,
  synthesize,
} from "@/services/speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 10000;

type RequestBody = {
  text: string;
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

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `text exceeds ${MAX_TEXT_LENGTH} characters` },
      { status: 413 },
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
    const { audio, contentType } = await synthesize(text, config, {
      rate: body.rate,
      pitch: body.pitch,
      style: body.style,
    });
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
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
