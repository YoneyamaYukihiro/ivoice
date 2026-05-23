import { NextRequest, NextResponse } from "next/server";
import {
  AcsCapabilityError,
  AcsConfigError,
  joinAsTeamsApp,
  loadAcsConfig,
} from "@/services/acs";
import { setCall } from "@/lib/call-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  meetingId: string;
  displayName?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.meetingId) {
    return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  }
  const displayName = body.displayName ?? "司会君";

  try {
    const config = loadAcsConfig();
    const { callConnectionId, serverCallId } = await joinAsTeamsApp(
      config,
      displayName,
    );
    setCall({
      callConnectionId,
      meetingId: body.meetingId,
      startedAt: Date.now(),
      mode: "live",
    });
    return NextResponse.json({
      mode: "live",
      callConnectionId,
      serverCallId,
    });
  } catch (err) {
    if (err instanceof AcsConfigError) {
      const callConnectionId = `sim-${Math.random().toString(36).slice(2, 10)}`;
      setCall({
        callConnectionId,
        meetingId: body.meetingId,
        startedAt: Date.now(),
        mode: "simulated",
        lastEvent: "CallConnected (simulated)",
      });
      return NextResponse.json({
        mode: "simulated",
        callConnectionId,
        notice: err.message,
      });
    }
    if (err instanceof AcsCapabilityError) {
      return NextResponse.json(
        { error: err.message, code: "acs_capability_missing" },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Join failed: ${message}` },
      { status: 502 },
    );
  }
}
