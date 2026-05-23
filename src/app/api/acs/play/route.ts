import { NextRequest, NextResponse } from "next/server";
import {
  AcsCapabilityError,
  AcsConfigError,
  loadAcsConfig,
  playText,
} from "@/services/acs";
import { getCall } from "@/lib/call-state";
import { renderSection } from "@/lib/template";
import type {
  AgendaItem,
  Icebreaker,
  Meeting,
  ModeratorScript,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  meetingId: string;
  script?: ModeratorScript;
  section?: keyof ModeratorScript;
  meeting?: Meeting;
  agenda?: AgendaItem;
  icebreaker?: Icebreaker;
  text?: string;
  voice?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.meetingId) {
    return NextResponse.json(
      { error: "meetingId is required" },
      { status: 400 },
    );
  }
  const call = getCall(body.meetingId);
  if (!call) {
    return NextResponse.json(
      { error: "No active call. Join the meeting first." },
      { status: 409 },
    );
  }

  let text: string;
  if (body.text) {
    text = body.text;
  } else {
    if (!body.script || !body.section || !body.meeting) {
      return NextResponse.json(
        { error: "Provide either `text` or (script + section + meeting)." },
        { status: 400 },
      );
    }
    text = renderSection(body.script, body.section, {
      meeting: body.meeting,
      agenda: body.agenda,
      icebreaker: body.icebreaker,
    });
  }

  if (call.mode === "simulated") {
    return NextResponse.json({ mode: "simulated", text, played: true });
  }

  try {
    const config = loadAcsConfig();
    await playText(config, call.callConnectionId, text, body.voice);
    return NextResponse.json({ mode: "live", text, played: true });
  } catch (err) {
    if (err instanceof AcsCapabilityError) {
      return NextResponse.json(
        { error: err.message, code: "acs_capability_missing", text },
        { status: 503 },
      );
    }
    if (err instanceof AcsConfigError) {
      return NextResponse.json(
        { error: err.message, code: "acs_not_configured", text },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Play failed: ${message}`, text },
      { status: 502 },
    );
  }
}
