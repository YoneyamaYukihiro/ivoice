"use client";

import { useEffect, useState } from "react";
import type { Meeting } from "@/lib/types";
import type { TranscriptLine } from "@/lib/transcript-store";

type Props = { meeting: Meeting };

type Minutes = {
  markdown: string;
  decisions: string[];
  actionItems: { who: string; what: string; due?: string }[];
};

export function MinutesPanel({ meeting }: Props) {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [speaker, setSpeaker] = useState(meeting.attendees[0] ?? "");
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [minutes, setMinutes] = useState<Minutes | null>(null);
  const [mode, setMode] = useState<"llm" | "fallback" | null>(null);
  const [postNotice, setPostNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch(
      `/api/transcript?meetingId=${encodeURIComponent(meeting.id)}`,
    );
    const data = await res.json();
    setLines(data.lines ?? []);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id]);

  useEffect(() => {
    setSpeaker(meeting.attendees[0] ?? "");
    setMinutes(null);
    setMode(null);
    setPostNotice(null);
    setError(null);
  }, [meeting.id, meeting.attendees]);

  const addLine = async () => {
    if (!draft.trim() || !speaker) return;
    await fetch("/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId: meeting.id,
        speaker,
        text: draft.trim(),
      }),
    });
    setDraft("");
    refresh();
  };

  const clear = async () => {
    if (!confirm("発話ログをクリアしますか?")) return;
    await fetch(
      `/api/transcript?meetingId=${encodeURIComponent(meeting.id)}`,
      { method: "DELETE" },
    );
    refresh();
  };

  const generate = async (post = false) => {
    setGenerating(true);
    setError(null);
    setPostNotice(null);
    try {
      const res = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting, post }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setMinutes(data.minutes);
      setMode(data.mode);
      if (post) {
        if (data.posted) {
          setPostNotice(
            `${data.target} へ投稿しました${data.url ? ` (${data.url})` : ""}`,
          );
        } else if (data.postError) {
          setPostNotice(data.postError);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const download = () => {
    if (!minutes) return;
    const blob = new Blob([minutes.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minutes-${meeting.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            議事録 (transcription + 要約)
          </h2>
          <p className="text-xs text-slate-500">
            ACS transcription を受け取り、Claude で要約 → Graph で投稿
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                mode === "llm"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {mode === "llm" ? "LLM 要約" : "未設定モード"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          発話ログ ({lines.length})
        </p>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          {lines.length === 0 ? (
            <p className="text-slate-500">
              まだ発話ログがありません。下のフォームから追加するか、ACS
              transcription を有効化してください。
            </p>
          ) : (
            <ul className="space-y-1">
              {lines.map((l) => (
                <li key={l.id} className="font-mono">
                  <span className="text-slate-500">
                    [{new Date(l.at).toLocaleTimeString("ja-JP")}]
                  </span>{" "}
                  <span className="font-semibold text-slate-700">
                    {l.speaker}:
                  </span>{" "}
                  <span className="text-slate-900">{l.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex-1 text-xs">
          <span className="mb-0.5 block text-slate-500">話者</span>
          <select
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {meeting.attendees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-[2] text-xs">
          <span className="mb-0.5 block text-slate-500">発話</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addLine();
            }}
            placeholder="例: 売上は前年同期比 110% でした"
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        <button
          type="button"
          onClick={addLine}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          追加
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          クリア
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => generate(false)}
          disabled={generating || lines.length === 0}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {generating ? "生成中…" : "議事録を生成"}
        </button>
        <button
          type="button"
          onClick={() => generate(true)}
          disabled={generating || lines.length === 0}
          className="rounded-lg border border-brand-500 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          生成 + Teams に投稿
        </button>
        {minutes && (
          <button
            type="button"
            onClick={download}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Markdown ダウンロード
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          {error}
        </div>
      )}
      {postNotice && (
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-800">
          {postNotice}
        </div>
      )}

      {minutes && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            生成結果
          </p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            {minutes.markdown}
          </pre>
          {(minutes.decisions.length > 0 || minutes.actionItems.length > 0) && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {minutes.decisions.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-700">
                    決定事項
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-slate-800">
                    {minutes.decisions.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {minutes.actionItems.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-700">
                    アクションアイテム
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-slate-800">
                    {minutes.actionItems.map((a, i) => (
                      <li key={i}>
                        <span className="font-medium">{a.who}</span>: {a.what}
                        {a.due && (
                          <span className="text-slate-500"> (期限: {a.due})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
