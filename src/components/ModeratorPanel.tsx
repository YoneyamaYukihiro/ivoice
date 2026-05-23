"use client";

import { useState } from "react";
import { defaultScript } from "@/lib/mock-data";
import type { Meeting, ModeratorScript, ModeratorStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type Props = {
  meeting: Meeting;
};

type Mode = "live" | "simulated" | null;

export function ModeratorPanel({ meeting }: Props) {
  const [status, setStatus] = useState<ModeratorStatus>("idle");
  const [autoMode, setAutoMode] = useState(true);
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
      if (autoMode) await speakSection("opening");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  };

  const speakSection = async (section: keyof ModeratorScript) => {
    setStatus("speaking");
    const res = await call("/api/acs/play", {
      meetingId: meeting.id,
      script,
      section,
      meeting,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? `HTTP ${res.status}`);
    } else {
      setLastUttered(data.text);
    }
    setStatus("listening");
  };

  const leave = async () => {
    setStatus("leaving");
    try {
      if (autoMode) await speakSection("closing");
      await call("/api/acs/leave", { meetingId: meeting.id });
    } finally {
      setStatus("idle");
      setMode(null);
      setNotice(null);
      setLastUttered(null);
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
          {(
            [
              ["opening", "冒頭"],
              ["icebreaker", "ネタ"],
              ["agendaTransition", "次議題"],
              ["timeWarning", "時間警告"],
              ["closing", "締め"],
            ] as const
          ).map(([section, label]) => (
            <button
              key={section}
              type="button"
              onClick={() => speakSection(section)}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700 transition hover:bg-slate-100"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={autoMode}
          onChange={(e) => setAutoMode(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
        />
        自動進行 (参加時オープニング・退出時クロージングを自動発話)
      </label>

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
