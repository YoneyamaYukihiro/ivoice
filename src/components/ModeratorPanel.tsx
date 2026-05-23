"use client";

import { useState } from "react";
import { defaultScript } from "@/lib/mock-data";
import { pickIcebreaker } from "@/lib/icebreakers";
import { renderSection } from "@/lib/template";
import type { Meeting, ModeratorScript, ModeratorStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type Props = {
  meeting: Meeting;
};

type Mode = "live" | "simulated" | null;
type Section = keyof ModeratorScript;
type PendingDraft = { section: Section; text: string };

const sectionLabels: Record<Section, string> = {
  opening: "冒頭",
  icebreaker: "ネタ",
  agendaTransition: "次議題",
  timeWarning: "時間警告",
  closing: "締め",
};

export function ModeratorPanel({ meeting }: Props) {
  const [status, setStatus] = useState<ModeratorStatus>("idle");
  const [autoMode, setAutoMode] = useState(true);
  const [approvalMode, setApprovalMode] = useState(false);
  const [pending, setPending] = useState<PendingDraft | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUttered, setLastUttered] = useState<string | null>(null);

  const script: ModeratorScript = defaultScript;
  const isActive = status !== "idle" && status !== "leaving";

  async function call(path: string, payload: unknown): Promise<Response> {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  const renderForSection = (section: Section): string =>
    renderSection(script, section, {
      meeting,
      agenda: section === "agendaTransition" ? meeting.agenda[0] : undefined,
      icebreaker: section === "icebreaker" ? pickIcebreaker() : undefined,
    });

  const playRaw = async (text: string) => {
    setStatus("speaking");
    setError(null);
    const res = await call("/api/acs/play", { meetingId: meeting.id, text });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? `HTTP ${res.status}`);
    } else {
      setLastUttered(data.text ?? text);
    }
    setStatus("listening");
  };

  const handleSection = async (section: Section) => {
    const text = renderForSection(section);
    if (approvalMode) {
      setPending({ section, text });
    } else {
      await playRaw(text);
    }
  };

  const approve = async () => {
    if (!pending) return;
    const draft = pending;
    setPending(null);
    await playRaw(draft.text);
  };

  const join = async () => {
    setError(null);
    setStatus("joining");
    try {
      const res = await call("/api/acs/join", {
        meetingId: meeting.id,
        displayName: "司会君",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setStatus("idle");
        return;
      }
      setMode(data.mode);
      setNotice(data.notice ?? null);
      setStatus("listening");
      if (autoMode) await handleSection("opening");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  };

  const leave = async () => {
    setStatus("leaving");
    try {
      if (autoMode && !approvalMode) {
        const text = renderForSection("closing");
        await playRaw(text);
      }
      await call("/api/acs/leave", { meetingId: meeting.id });
    } finally {
      setStatus("idle");
      setMode(null);
      setNotice(null);
      setLastUttered(null);
      setPending(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">司会君</h2>
          <p className="text-xs text-slate-500">
            ACS Call Automation で Teams 会議に参加し、台本に沿って発話します
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                mode === "live"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {mode === "live" ? "実機接続" : "シミュレーション"}
            </span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isActive}
          onClick={join}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          会議に参加
        </button>
        <button
          type="button"
          disabled={!isActive}
          onClick={leave}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          退出
        </button>
      </div>

      {isActive && (
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs">
          {(Object.keys(sectionLabels) as Section[]).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => handleSection(section)}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700 transition hover:bg-slate-100"
            >
              {sectionLabels[section]}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={autoMode}
            onChange={(e) => setAutoMode(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
          />
          自動進行 (参加時オープニング・退出時クロージングを自動発話)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={approvalMode}
            onChange={(e) => setApprovalMode(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
          />
          事前承認モード (発話前に内容を確認・編集)
        </label>
      </div>

      {pending && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-900">
              発話プレビュー: {sectionLabels[pending.section]}
            </p>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="text-xs text-amber-700 hover:underline"
            >
              破棄
            </button>
          </div>
          <textarea
            value={pending.text}
            onChange={(e) =>
              setPending({ ...pending, text: e.target.value })
            }
            rows={3}
            className="mt-2 w-full resize-y rounded border border-amber-200 bg-white p-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={approve}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
            >
              承認して発話
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      {lastUttered && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
          <p className="font-semibold text-slate-700">直近の発話</p>
          <p className="mt-1 text-slate-700">{lastUttered}</p>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs">
        <p className="font-semibold text-slate-700">会議情報</p>
        <dl className="mt-2 space-y-1 text-slate-600">
          <div className="flex justify-between">
            <dt>件名</dt>
            <dd className="font-medium text-slate-900">{meeting.subject}</dd>
          </div>
          <div className="flex justify-between">
            <dt>主催</dt>
            <dd>{meeting.organizer}</dd>
          </div>
          <div className="flex justify-between">
            <dt>参加URL</dt>
            <dd className="font-mono">{meeting.joinUrl ? "あり" : "なし"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
