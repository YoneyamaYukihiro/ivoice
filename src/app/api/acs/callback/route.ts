import { NextRequest, NextResponse } from "next/server";
import { parseCallAutomationEvent } from "@azure/communication-call-automation";
import { annotateEvent } from "@/lib/call-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Azure Communication Services が発火する Call Automation イベントを受ける
 * webhook。ACS_CALLBACK_URI に設定した URL がこれ。
 */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  try {
    const events = parseCallAutomationEvent(payload);
    const list = Array.isArray(events) ? events : [events];
    for (const ev of list) {
      const id = (ev as { callConnectionId?: string }).callConnectionId;
      const kind = (ev as { kind?: string }).kind ?? "Unknown";
      if (id) annotateEvent(id, kind);
    }
    return NextResponse.json({ received: list.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Callback parse failed: ${message}` },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
