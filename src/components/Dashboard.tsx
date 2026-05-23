"use client";

import { useMemo, useState } from "react";
import { mockMeetings, defaultScript } from "@/lib/mock-data";
import { MeetingCard } from "./MeetingCard";
import { AgendaList } from "./AgendaList";
import { ModeratorPanel } from "./ModeratorPanel";
import { ScriptEditor } from "./ScriptEditor";
import { IcebreakerPanel } from "./IcebreakerPanel";
import { SpeechPreview } from "./SpeechPreview";

export function Dashboard() {
  const [selectedId, setSelectedId] = useState(mockMeetings[0]?.id ?? "");

  const selected = useMemo(
    () => mockMeetings.find((m) => m.id === selectedId) ?? mockMeetings[0],
    [selectedId],
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
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
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Microsoft Graph: モックモード
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Azure Speech: モックモード
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            本日の予定 ({mockMeetings.length})
          </h2>
          <div className="space-y-3">
            {mockMeetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                selected={m.id === selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </section>

        <section className="space-y-6">
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
              <ScriptEditor initial={defaultScript} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
