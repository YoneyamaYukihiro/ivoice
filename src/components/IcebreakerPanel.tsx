"use client";

import { useState } from "react";
import {
  categoryLabels,
  icebreakers,
  pickIcebreaker,
} from "@/lib/icebreakers";
import type { Icebreaker, IcebreakerCategory, IcebreakerTiming } from "@/lib/types";

const categories: (IcebreakerCategory | "all")[] = [
  "all",
  "dajare",
  "trivia",
  "weather",
  "tech",
];

const timingLabels: Record<IcebreakerTiming, string> = {
  opening: "オープニング",
  agendaTransition: "議題切替",
  closing: "クロージング",
  manual: "手動のみ",
};

export function IcebreakerPanel() {
  const [enabled, setEnabled] = useState(true);
  const [category, setCategory] = useState<IcebreakerCategory | "all">("all");
  const [timing, setTiming] = useState<IcebreakerTiming>("opening");
  const [current, setCurrent] = useState<Icebreaker>(() => icebreakers[0]!);
  const [history, setHistory] = useState<string[]>([icebreakers[0]!.id]);
  const [speaking, setSpeaking] = useState(false);

  const shuffle = () => {
    const next = pickIcebreaker(
      category === "all" ? undefined : category,
      history.slice(-5),
    );
    setCurrent(next);
    setHistory((h) => [...h, next.id]);
  };

  const speak = () => {
    setSpeaking(true);
    setTimeout(() => setSpeaking(false), 1800);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            一言ネタ
          </h2>
          <p className="text-xs text-slate-500">
            アイスブレイクとして司会君が会議で発話します
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <span className="text-slate-600">
            {enabled ? "有効" : "無効"}
          </span>
          <span className="relative">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <span className="block h-6 w-10 rounded-full bg-slate-300 transition peer-checked:bg-brand-500" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
          </span>
        </label>
      </div>

      <div
        className={`mt-4 rounded-lg border p-4 transition ${
          speaking
            ? "border-emerald-400 bg-emerald-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-600">
            {categoryLabels[current.category]}
          </span>
          {speaking && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              発話中
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-900">
          「{current.text}」
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!enabled}
          onClick={shuffle}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          別のネタにする
        </button>
        <button
          type="button"
          disabled={!enabled || speaking}
          onClick={speak}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          今すぐ喋らせる
        </button>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            カテゴリ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const active = c === category;
              const label = c === "all" ? "すべて" : categoryLabels[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-brand-500 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            自動投入タイミング
          </p>
          <select
            value={timing}
            onChange={(e) => setTiming(e.target.value as IcebreakerTiming)}
            disabled={!enabled}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {(Object.keys(timingLabels) as IcebreakerTiming[]).map((t) => (
              <option key={t} value={t}>
                {timingLabels[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
