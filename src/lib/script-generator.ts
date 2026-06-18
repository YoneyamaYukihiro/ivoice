// ブラウザ → /api/reader/script の薄いクライアント。
// API route が Ollama を中継するので、ここでは CORS を気にせず fetch するだけ。

import type { Member } from "@/lib/members";

export type ScriptTone = "standard" | "friendly" | "formal";

export type GenerateRequest = {
  notes: string;
  model?: string;
  title?: string;
  tone?: ScriptTone;
  withSections?: boolean;
  members?: Member[];
};

export type GenerateResult =
  | { ok: true; script: string; model: string }
  | { ok: false; error: string };

export async function generateScript(
  req: GenerateRequest,
): Promise<GenerateResult> {
  let res: Response;
  try {
    res = await fetch("/api/reader/script", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        notes: req.notes,
        model: req.model,
        title: req.title,
        tone: req.tone,
        withSections: req.withSections,
        members: req.members?.map((m) => ({
          surface: m.surface,
          reading: m.reading,
          honorific: m.honorific,
        })),
      }),
    });
  } catch {
    return {
      ok: false,
      error: "サーバに接続できませんでした。dev サーバが起動しているか確認してください。",
    };
  }

  const data = (await res.json().catch(() => null)) as
    | { script?: string; model?: string; error?: string }
    | null;

  if (!res.ok || !data?.script) {
    return {
      ok: false,
      error: data?.error ?? `生成に失敗しました (HTTP ${res.status})`,
    };
  }
  return { ok: true, script: data.script, model: data.model ?? "" };
}

export type ModelsResult =
  | { ok: true; models: string[]; default: string }
  | { ok: false; error: string };

/** インストール済みモデル一覧を取得。失敗してもUIは既定値で動かせるよう ok:false を返すだけ。 */
export async function listModels(): Promise<ModelsResult> {
  try {
    const res = await fetch("/api/reader/models");
    const data = (await res.json().catch(() => null)) as
      | { models?: string[]; default?: string; error?: string }
      | null;
    if (!res.ok || !data?.models) {
      return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, models: data.models, default: data.default ?? "" };
  } catch {
    return { ok: false, error: "サーバに接続できませんでした" };
  }
}
