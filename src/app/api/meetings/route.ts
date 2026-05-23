import { NextResponse } from "next/server";
import { getTodaysMeetings } from "@/lib/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getTodaysMeetings();
  return NextResponse.json(result);
}
