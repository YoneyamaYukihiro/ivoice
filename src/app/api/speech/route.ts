import { NextRequest, NextResponse } from "next/server";
import {
  loadSpeechConfig,
  SpeechConfigError,
  SpeechSynthesisError,
  synthesize,
} from "@/services/speech";
import { renderSection } from "@/lib/template";
import type {
  AgendaItem,
  Icebreaker,
  Meeting,
  ModeratorScript,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  script: ModeratorScript;
  section: keyof ModeratorScript;
  meeting: Meeting;
  agenda?: AgendaItem;
  icebreaker?: Icebreaker;
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

  if (!body.script || !body.section || !body.meeting) {
    return NextResponse.json(
      { error: "script, section, and meeting are required" },
      { status: 400 },
    );
  }

  const text = renderSection(body.script, body.section, {
    meeting: body.meeting,
    agenda: body.agenda,
    icebreaker: body.icebreaker,
  });

  if (!text.trim()) {
    return NextResponse.json(
      { error: "Rendered text is empty" },
      { status: 400 },
    );
  }

  let config;
  try {
    config = loadSpeechConfig();
  } catch (err) {
    if (err instanceof SpeechConfigError) {
      return NextResponse.json(
        { error: err.message, code: "speech_not_configured", text },
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
        "X-Rendered-Text": encodeURIComponent(text),
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
