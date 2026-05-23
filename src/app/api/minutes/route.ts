import { NextRequest, NextResponse } from "next/server";
import { getTranscript } from "@/lib/transcript-store";
import {
  fallbackMinutes,
  LlmApiError,
  LlmConfigError,
  loadLlmConfig,
  summarize,
} from "@/services/llm";
import {
  GraphApiError,
  GraphConfigError,
  loadGraphConfig,
} from "@/services/graph";
import { loadPostTarget, postMinutes } from "@/services/graph-post";
import type { Meeting } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  meeting: Meeting;
  post?: boolean;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.meeting) {
    return NextResponse.json({ error: "meeting is required" }, { status: 400 });
  }

  const transcript = getTranscript(body.meeting.id);

  let minutes;
  let mode: "llm" | "fallback" = "fallback";
  try {
    const config = loadLlmConfig();
    minutes = await summarize(config, body.meeting, transcript);
    mode = "llm";
  } catch (err) {
    if (err instanceof LlmConfigError) {
      minutes = fallbackMinutes(body.meeting, transcript);
    } else if (err instanceof LlmApiError) {
      return NextResponse.json(
        { error: err.message, code: "llm_api_error", detail: err.body },
        { status: 502 },
      );
    } else {
      throw err;
    }
  }

  if (!body.post) {
    return NextResponse.json({ mode, minutes, posted: false });
  }

  try {
    const graphConfig = loadGraphConfig();
    const target = loadPostTarget();
    const result = await postMinutes(
      graphConfig,
      target,
      body.meeting.subject,
      minutes.markdown,
    );
    return NextResponse.json({
      mode,
      minutes,
      posted: true,
      target: target.kind,
      url: result.url,
    });
  } catch (err) {
    if (err instanceof GraphConfigError) {
      return NextResponse.json({
        mode,
        minutes,
        posted: false,
        postError: "Microsoft Graph 未設定のため投稿をスキップしました",
      });
    }
    if (err instanceof GraphApiError) {
      return NextResponse.json({
        mode,
        minutes,
        posted: false,
        postError: `Graph 投稿エラー: ${err.message}`,
      });
    }
    throw err;
  }
}
