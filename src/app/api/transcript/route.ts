import { NextRequest, NextResponse } from "next/server";
import {
  appendLine,
  clearTranscript,
  getTranscript,
} from "@/lib/transcript-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  }
  return NextResponse.json({ lines: getTranscript(meetingId) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    meetingId?: string;
    speaker?: string;
    text?: string;
  } | null;
  if (!body?.meetingId || !body.speaker || !body.text) {
    return NextResponse.json(
      { error: "meetingId, speaker, text are required" },
      { status: 400 },
    );
  }
  const line = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    meetingId: body.meetingId,
    speaker: body.speaker,
    text: body.text,
    at: Date.now(),
  };
  appendLine(line);
  return NextResponse.json({ line });
}

export async function DELETE(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  }
  clearTranscript(meetingId);
  return NextResponse.json({ ok: true });
}
