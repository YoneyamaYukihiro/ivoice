import type { Meeting } from "@/lib/types";
import type { TranscriptLine } from "@/lib/transcript-store";
import { transcriptToPlainText } from "@/lib/transcript-store";

export type LlmConfig = {
  apiKey: string;
  model: string;
};

export class LlmConfigError extends Error {}
export class LlmApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message);
  }
}

export function loadLlmConfig(): LlmConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  if (!apiKey) {
    throw new LlmConfigError(
      "ANTHROPIC_API_KEY is not set. Configure .env.local from .env.example.",
    );
  }
  return { apiKey, model };
}

export type Minutes = {
  markdown: string;
  decisions: string[];
  actionItems: { who: string; what: string; due?: string }[];
};

const SYSTEM_PROMPT = `あなたは日本のビジネス会議の議事録作成を専門とするアシスタントです。
与えられた発話ログを読み、以下のフォーマットで簡潔・正確な議事録を作成してください。

出力は必ず JSON で、次のスキーマに従ってください:
{
  "markdown": "## 概要\\n...\\n## 議論内容\\n...\\n## 決定事項\\n- ...\\n## アクションアイテム\\n- 担当: 内容 (期限)",
  "decisions": ["決定事項1", "決定事項2"],
  "actionItems": [{"who": "担当者名", "what": "作業内容", "due": "期限 (任意)"}]
}

注意:
- 推測で事実を補わない。ログに無い情報は書かない。
- 司会君 (bot) の進行発話は議事に入れない。
- 日本語で出力する。`;

export async function summarize(
  config: LlmConfig,
  meeting: Meeting,
  transcript: TranscriptLine[],
): Promise<Minutes> {
  const plain = transcriptToPlainText(transcript);
  const userText = `# 会議情報
件名: ${meeting.subject}
主催: ${meeting.organizer}
開始: ${meeting.startsAt}
終了: ${meeting.endsAt}
参加者: ${meeting.attendees.join(", ")}

# 発話ログ
${plain || "(発話なし)"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userText }],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new LlmApiError(
      `Claude API error: ${res.status} ${res.statusText}`,
      res.status,
      body,
    );
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  const text = data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  // The model is asked to return JSON; tolerate code fences.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Minutes;
    return parsed;
  } catch {
    return {
      markdown: text,
      decisions: [],
      actionItems: [],
    };
  }
}

export function fallbackMinutes(
  meeting: Meeting,
  transcript: TranscriptLine[],
): Minutes {
  const plain = transcriptToPlainText(transcript);
  return {
    markdown: `## 概要\n${meeting.subject} の議事録 (自動要約 未設定モード)\n\n## 参加者\n${meeting.attendees.join(", ")}\n\n## 発話ログ抜粋\n\n${plain || "(発話なし)"}\n\n> ANTHROPIC_API_KEY を設定すると Claude による要約が動作します。`,
    decisions: [],
    actionItems: [],
  };
}
