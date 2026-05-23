"use client";

import { useState } from "react";
import type { ModeratorScript } from "@/lib/types";

type Props = {
  initial: ModeratorScript;
};

const fields: { key: keyof ModeratorScript; label: string; hint: string }[] = [
  { key: "opening", label: "オープニング", hint: "会議冒頭の挨拶・進行宣言" },
  { key: "icebreaker", label: "一言ネタ枕詞", hint: "{{icebreaker.text}} の前後に添える定型" },
  { key: "agendaTransition", label: "アジェンダ遷移", hint: "次の議題に進むときの定型句" },
  { key: "timeWarning", label: "時間警告", hint: "残り 1 分時のアナウンス" },
  { key: "closing", label: "クロージング", hint: "会議終了時の締めの挨拶" },
];

export function ScriptEditor({ initial }: Props) {
  const [script, setScript] = useState(initial);
  const [saved, setSaved] = useState(false);

  const update = (key: keyof ModeratorScript, value: string) => {
    setScript((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">司会台本</h2>
          <p className="text-xs text-slate-500">
            {"{{...}}"} 形式のプレースホルダで会議情報を差し込めます
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          {saved ? "保存済み" : "保存"}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <div className="flex items-baseline justify-between">
              <label
                htmlFor={f.key}
                className="text-sm font-medium text-slate-700"
              >
                {f.label}
              </label>
              <span className="text-xs text-slate-400">{f.hint}</span>
            </div>
            <textarea
              id={f.key}
              value={script[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              rows={2}
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
