"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Meeting, ModeratorScript } from "@/lib/types";
import { defaultScript } from "@/lib/mock-data";
import { renderSection } from "@/lib/template";
import { formatTime, relativeStart } from "@/lib/format";

type Props = {
  meetings: Meeting[];
  onSelect?: (meetingId: string) => void;
};

type State =
  | { phase: "idle" }
  | { phase: "in_meeting"; meetingId: string }
  | { phase: "between"; nextMeetingId: string };

type Phase = "before" | "warning" | "active" | "done";

function meetingPhase(m: Meeting, now: Date): Phase {
  const start = new Date(m.startsAt).getTime();
  const end = new Date(m.endsAt).getTime();
  const t = now.getTime();
  if (t < start - 60_000) return "before";
  if (t < start) return "warning";
  if (t < end) return "active";
  return "done";
}

export function SchedulerPanel({ meetings, onSelect }: Props) {
  const [autoPilot, setAutoPilot] = useState(false);
  const [state, setState] = useState<State>({ phase: "idle" });
  const [now, setNow] = useState<Date>(() => new Date());
  const [log, setLog] = useState<string[]>([]);
  const handledRef = useRef<Set<string>>(new Set());
  const script: ModeratorScript = defaultScript;

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const sorted = useMemo(
    () =>
      [...meetings].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    [meetings],
  );

  const phases = useMemo(
    () => new Map(sorted.map((m) => [m.id, meetingPhase(m, now)])),
    [sorted, now],
  );

  const append = (line: string) =>
    setLog((l) => [
      `[${now.toLocaleTimeString("ja-JP")}] ${line}`,
      ...l.slice(0, 49),
    ]);

  // Auto-pilot side effects
  useEffect(() => {
    if (!autoPilot) return;
    (async () => {
      for (const m of sorted) {
        const phase = phases.get(m.id)!;
        const joinKey = `join:${m.id}`;
        const leaveKey = `leave:${m.id}`;
        if (
          (phase === "warning" || phase === "active") &&
          state.phase !== "in_meeting" &&
          !handledRef.current.has(joinKey)
        ) {
          handledRef.current.add(joinKey);
          onSelect?.(m.id);
          append(`${m.subject} に参加します`);
          const res = await fetch("/api/acs/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meetingId: m.id,
              displayName: "司会君",
            }),
          });
          if (res.ok) {
            setState({ phase: "in_meeting", meetingId: m.id });
            const text = renderSection(script, "opening", { meeting: m });
            await fetch("/api/acs/play", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ meetingId: m.id, text }),
            });
            append(`オープニング発話: ${text.slice(0, 30)}…`);
          }
          break;
        }
        if (
          phase === "done" &&
          state.phase === "in_meeting" &&
          state.meetingId === m.id &&
          !handledRef.current.has(leaveKey)
        ) {
          handledRef.current.add(leaveKey);
          const text = renderSection(script, "closing", { meeting: m });
          await fetch("/api/acs/play", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meetingId: m.id, text }),
          });
          await fetch("/api/acs/leave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meetingId: m.id }),
          });
          append(`${m.subject} から退出しました`);
          setState({ phase: "idle" });
          break;
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPilot, now]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            スケジューラ
          </h2>
          <p className="text-xs text-slate-500">
            本日の予定を時系列で表示し、自動参加・退出を制御します
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <span className="text-slate-600">
            自動操縦 {autoPilot ? "ON" : "OFF"}
          </span>
          <span className="relative">
            <input
              type="checkbox"
              checked={autoPilot}
              onChange={(e) => {
                setAutoPilot(e.target.checked);
                if (e.target.checked) handledRef.current.clear();
              }}
              className="peer sr-only"
            />
            <span className="block h-6 w-10 rounded-full bg-slate-300 transition peer-checked:bg-brand-500" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
          </span>
        </label>
      </div>

      <ol className="mt-4 space-y-2">
        {sorted.map((m) => {
          const phase = phases.get(m.id)!;
          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition ${
                phase === "active"
                  ? "border-emerald-400 bg-emerald-50"
                  : phase === "warning"
                    ? "border-amber-400 bg-amber-50"
                    : phase === "done"
                      ? "border-slate-200 bg-slate-50 opacity-70"
                      : "border-slate-200 bg-white"
              }`}
            >
              <span className="w-6 text-center">
                {phase === "active" ? (
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                ) : phase === "warning" ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                ) : phase === "done" ? (
                  <span className="text-xs text-slate-400">✓</span>
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
                )}
              </span>
              <span className="font-mono text-xs text-slate-600">
                {formatTime(m.startsAt)}
              </span>
              <button
                type="button"
                onClick={() => onSelect?.(m.id)}
                className="min-w-0 flex-1 truncate text-left font-medium text-slate-900 hover:underline"
              >
                {m.subject}
              </button>
              <span className="shrink-0 text-xs text-slate-500">
                {phase === "active"
                  ? "進行中"
                  : phase === "warning"
                    ? "まもなく開始"
                    : phase === "done"
                      ? "終了"
                      : relativeStart(m.startsAt, now)}
              </span>
            </li>
          );
        })}
      </ol>

      {log.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            自動操縦ログ
          </p>
          <ul className="max-h-32 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-700">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
