"use client";

import { useState } from "react";
import type { Meeting, ModeratorStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type Props = {
  meeting: Meeting;
};

export function ModeratorPanel({ meeting }: Props) {
  const [status, setStatus] = useState<ModeratorStatus>("idle");
  const [autoMode, setAutoMode] = useState(true);

  const join = () => {
    setStatus("joining");
    setTimeout(() => setStatus("speaking"), 800);
    setTimeout(() => setStatus("listening"), 3000);
  };
  const leave = () => {
    setStatus("leaving");
    setTimeout(() => setStatus("idle"), 800);
  };

  const isActive = status !== "idle" && status !== "leaving";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">司会君</h2>
          <p className="text-xs text-slate-500">
            Teams 会議に bot として参加し、台本に沿って進行します
          </p>
        </div>
        <StatusBadge status={status} />
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

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={autoMode}
          onChange={(e) => setAutoMode(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
        />
        自動進行 (アジェンダの時間管理・自動アナウンス)
      </label>

      <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs">
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
            <dd className="font-mono">
              {meeting.joinUrl ? "あり" : "なし"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
