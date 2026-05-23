"use client";

import { useMemo, useState } from "react";
import { defaultScript } from "@/lib/mock-data";
import type { Meeting } from "@/lib/types";
import type { MeetingsSource } from "@/lib/meetings";
import { MeetingCard } from "./MeetingCard";
import { AgendaList } from "./AgendaList";
import { ModeratorPanel } from "./ModeratorPanel";
import { ScriptEditor } from "./ScriptEditor";
import { IcebreakerPanel } from "./IcebreakerPanel";
import { SpeechPreview } from "./SpeechPreview";
import { MinutesPanel } from "./MinutesPanel";
import { SchedulerPanel } from "./SchedulerPanel";

type Props = {
  meetings: Meeting[];
  source: MeetingsSource;
  notice?: string;
  speechConfigured: boolean;
};

const sourceLabel: Record<MeetingsSource, string> = {
  graph: "Microsoft Graph: 接続中",
  mock: "Microsoft Graph: モックモード",
};

export function Dashboard({
  meetings,
  source,
  notice,
  speechConfigured,
}: Props) {
  const [selectedId, setSelectedId] = useState(meetings[0]?.id ?? "");

  const selected = useMemo(
    () => meetings.find((m) => m.id === selectedId) ?? meetings[0],
    [selectedId, meetings],
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            司会君 ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            SPO 予定表と連動して Teams 会議の進行を自動化します
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                source === "graph" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {sourceLabel[source]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                speechConfigured ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            Azure Speech: {speechConfigured ? "接続中" : "モックモード"}
          </span>
        </div>
      </header>

      {notice && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            本日の予定 ({meetings.length})
          </h2>
          <div className="space-y-3">
            {meetings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                予定がありません
              </p>
            ) : (
              meetings.map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  selected={m.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <SchedulerPanel meetings={meetings} onSelect={setSelectedId} />
          {selected && (
            <>
              <ModeratorPanel meeting={selected} />
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="mb-3 text-base font-semibold text-slate-900">
                    アジェンダ
                  </h2>
                  <AgendaList
                    items={selected.agenda}
                    activeId={selected.agenda[0]?.id}
                  />
                </div>
                <IcebreakerPanel />
              </div>
              <SpeechPreview meeting={selected} />
              <MinutesPanel meeting={selected} />
              <ScriptEditor initial={defaultScript} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
