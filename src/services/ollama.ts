// ローカル Ollama を司会原稿の生成に使うためのサービス層。
// クラウド非依存（API キー不要）。Ollama 未起動でも呼び出し側でフォールバックできるよう、
// 例外を種類分けして投げる（src/services/llm.ts と同じ思想）。

export type OllamaConfig = {
  baseUrl: string;
  model: string;
};

/** Ollama に到達できない（未起動・ポート違い等）。呼び出し側で 503 + 案内に落とす。 */
export class OllamaUnreachableError extends Error {}
/** Ollama は応答したが HTTP エラー（モデル未 pull 等）。 */
export class OllamaApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message);
  }
}

export function loadOllamaConfig(): OllamaConfig {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
  return { baseUrl: baseUrl.replace(/\/$/, ""), model };
}

export type ScriptMember = {
  surface: string;
  reading?: string;
  honorific?: string;
};

export type GenerateScriptInput = {
  /** ユーザーが渡すネタ（箇条書き / アジェンダ / Teams ログ等） */
  notes: string;
  /** 使うモデル名。未指定なら config.model（既定 qwen2.5:3b）。 */
  model?: string;
  /** 会議名（例: "朝会"）。プロンプトの文脈に使う。 */
  title?: string;
  /** トーン。標準 / フレンドリー / フォーマル。 */
  tone?: "standard" | "friendly" | "formal";
  /** # 見出しでセクション分けするか（司会モード用）。 */
  withSections?: boolean;
  /** 既知のメンバー。氏名表記の揺れを防ぐためプロンプトに渡す。 */
  members?: ScriptMember[];
};

const TONE_LABEL: Record<NonNullable<GenerateScriptInput["tone"]>, string> = {
  standard: "落ち着いた標準的なビジネス口調",
  friendly: "親しみやすく柔らかい口調",
  formal: "丁寧でフォーマルな口調",
};

function buildSystemPrompt(input: GenerateScriptInput): string {
  const tone = TONE_LABEL[input.tone ?? "standard"];
  const lines: string[] = [
    "あなたは日本のチーム会議を進行する司会者です。",
    "渡されたネタ（箇条書き・アジェンダ・チャットログ）をもとに、そのまま声に出して読める司会原稿を作成してください。",
    "",
    "# 厳守事項（最優先）",
    "- ネタに書かれている項目（各行・各箇条書き）を、漏れなく一つずつ必ず原稿に反映する。勝手に項目を飛ばしたり、まとめて省略したりしない。",
    "- ネタに書かれていない事実・固有名詞・人名・数字・日時・予定を一切追加しない。例や具体例を創作しない。情報が少ない項目は、書いてある内容だけを短く一文で触れる（無理に膨らませない）。",
    "- 「〜について確認します」「詳しくはお知らせください」のような、中身のない埋め草で水増ししない。",
    "",
    "# その他",
    `- ${tone}で書く。`,
    "- 音声合成（TTS）でそのまま読み上げる前提。記号の羅列・箇条書き・マークダウンの装飾（** や - や番号付き）は使わず、自然な話し言葉の文章にする。",
    "- 出力は司会原稿の本文のみ。前置き（「はい、承知しました」等）や注釈・コードブロックは一切付けない。",
  ];
  if (input.withSections) {
    lines.push(
      "- 話題の区切りごとに、行頭に「# 見出し」を置いてセクション分けする。見出しは短く（例: # 本日の連絡、# 今日の予定）。見出し自体は読み上げ対象なので体言止めの短い語にする。",
      "- 各見出しの直後には必ず本文を1〜2文書く。見出しだけの行を続けてはいけない。本文に書く中身が無いネタは見出しごと省く。",
    );
  } else {
    lines.push("- 見出しは付けず、ひと続きの原稿にする。");
  }
  if (input.members && input.members.length > 0) {
    const names = input.members.map((m) => m.surface).join("、");
    lines.push(
      "",
      "# メンバー",
      `次の氏名は登録済みです。原稿中ではこの表記をそのまま使ってください（敬称は後工程で自動付与されるため付けても付けなくても構いません）: ${names}`,
    );
  }
  return lines.join("\n");
}

function buildUserPrompt(input: GenerateScriptInput): string {
  const head = input.title ? `会議名: ${input.title}\n\n` : "";
  return `${head}# ネタ（このまま司会原稿に起こしてください）\n${input.notes.trim()}`;
}

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

export async function generateScript(
  config: OllamaConfig,
  input: GenerateScriptInput,
): Promise<{ script: string; model: string }> {
  const model = input.model?.trim() || config.model;
  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        // 創作・脱落を抑えるため低温＋top_pを絞る（司会原稿はネタへの忠実さ優先）
        options: { temperature: 0.3, top_p: 0.8 },
        messages: [
          { role: "system", content: buildSystemPrompt(input) },
          { role: "user", content: buildUserPrompt(input) },
        ],
      }),
      cache: "no-store",
    });
  } catch (err) {
    throw new OllamaUnreachableError(
      `Ollama (${config.baseUrl}) に接続できませんでした: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new OllamaApiError(
      `Ollama API error: ${res.status} ${res.statusText}`,
      res.status,
      body,
    );
  }

  const data = (await res.json()) as OllamaChatResponse;
  if (data.error) {
    throw new OllamaApiError(`Ollama error: ${data.error}`, 500, data.error);
  }
  return { script: stripArtifacts(data.message?.content ?? ""), model };
}

/** インストール済みモデル名の一覧を取得（/api/tags）。 */
export async function listModels(config: OllamaConfig): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/api/tags`, { cache: "no-store" });
  } catch (err) {
    throw new OllamaUnreachableError(
      `Ollama (${config.baseUrl}) に接続できませんでした: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new OllamaApiError(
      `Ollama API error: ${res.status} ${res.statusText}`,
      res.status,
      body,
    );
  }
  const data = (await res.json()) as { models?: { name?: string }[] };
  return (data.models ?? [])
    .map((m) => m.name)
    .filter((n): n is string => Boolean(n));
}

/** 行頭に出がちな相槌の前置き（「はい、承知しました。」等）。 */
const PREAMBLE =
  /^(はい[、,。]?\s*)?(承知(いた)?しました|了解(です)?|かしこまりました|わかりました|もちろん(です)?)[。、,!！]?\s*/;

/** モデルが付けがちな前置き・コードフェンス・装飾・リテラル \n を落とす。 */
function stripArtifacts(text: string): string {
  let out = text.trim();
  // コードフェンス
  out = out.replace(/^```(?:\w+)?\s*/i, "").replace(/```$/i, "").trim();
  // 相槌の前置きを（連続していても）剥がす
  let prev: string;
  do {
    prev = out;
    out = out.replace(PREAMBLE, "").trim();
  } while (out !== prev);
  // モデルがたまに出力するリテラルの \n を実改行に
  out = out.replace(/\\n/g, "\n");
  // 本文が空の見出しが連続した場合に末尾の裸見出しを落とす
  return out.trim();
}
