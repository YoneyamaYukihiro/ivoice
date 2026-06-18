import { NextResponse } from "next/server";
import {
  listModels,
  loadOllamaConfig,
  OllamaApiError,
  OllamaUnreachableError,
} from "@/services/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = loadOllamaConfig();
  try {
    const models = await listModels(config);
    return NextResponse.json({ models, default: config.model });
  } catch (err) {
    if (err instanceof OllamaUnreachableError) {
      return NextResponse.json(
        {
          error:
            "ローカルの Ollama に接続できませんでした。`ollama serve` が起動しているか確認してください。",
          code: "ollama_unreachable",
        },
        { status: 503 },
      );
    }
    if (err instanceof OllamaApiError) {
      return NextResponse.json(
        { error: err.message, code: "ollama_api_error" },
        { status: 502 },
      );
    }
    throw err;
  }
}
