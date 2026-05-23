import { NextRequest, NextResponse } from "next/server";
import { AcsConfigError, disconnect, loadAcsConfig } from "@/services/acs";
import { getCall, removeCall } from "@/lib/call-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { meetingId: string };

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.meetingId) {
    return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  }
  const call = getCall(body.meetingId);
  if (!call) {
    return NextResponse.json({ ok: true, alreadyClosed: true });
  }

  if (call.mode === "simulated") {
    removeCall(body.meetingId);
    return NextResponse.json({ ok: true, mode: "simulated" });
  }

  try {
    const config = loadAcsConfig();
    await disconnect(config, call.callConnectionId);
    removeCall(body.meetingId);
    return NextResponse.json({ ok: true, mode: "live" });
  } catch (err) {
    if (err instanceof AcsConfigError) {
      removeCall(body.meetingId);
      return NextResponse.json({ ok: true, mode: "simulated" });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
