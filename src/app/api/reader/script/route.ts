import { NextRequest, NextResponse } from "next/server";
import {
  generateScript,
  loadOllamaConfig,
  OllamaApiError,
  OllamaUnreachableError,
  type GenerateScriptInput,
} from "@/services/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = Partial<GenerateScriptInput>;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.notes || !body.notes.trim()) {
    return NextResponse.json({ error: "notes is required" }, { status: 400 });
  }

  const config = loadOllamaConfig();
  try {
    const { script, model } = await generateScript(config, {
      notes: body.notes,
      model: body.model,
      title: body.title,
      tone: body.tone,
      withSections: body.withSections ?? true,
      members: body.members,
    });
    return NextResponse.json({ script, model });
  } catch (err) {
    if (err instanceof OllamaUnreachableError) {
      return NextResponse.json(
        {
          error:
            "ローカルの Ollama に接続できませんでした。`ollama serve` が起動しているか確認してください。",
          code: "ollama_unreachable",
          detail: err.message,
        },
        { status: 503 },
      );
    }
    if (err instanceof OllamaApiError) {
      const wanted = body.model?.trim() || config.model;
      const hint = /not found|no such model/i.test(err.body)
        ? `モデル「${wanted}」が見つかりません。\`ollama pull ${wanted}\` を実行してください。`
        : err.message;
      return NextResponse.json(
        { error: hint, code: "ollama_api_error", detail: err.body },
        { status: 502 },
      );
    }
    throw err;
  }
}
