"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pickIcebreaker } from "@/lib/icebreakers";
import { defaultScript } from "@/lib/mock-data";
import { renderSection } from "@/lib/template";
import type { Meeting, ModeratorScript } from "@/lib/types";

type Section = keyof ModeratorScript;

const sectionLabels: Record<Section, string> = {
  opening: "オープニング",
  icebreaker: "一言ネタ",
  agendaTransition: "アジェンダ遷移",
  timeWarning: "時間警告",
  closing: "クロージング",
};

type Props = {
  meeting: Meeting;
  script?: ModeratorScript;
};

export function SpeechPreview({ meeting, script = defaultScript }: Props) {
  const [section, setSection] = useState<Section>("opening");
  const [rate, setRate] = useState("+0%");
  const [pitch, setPitch] = useState("+0%");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const agenda = meeting.agenda[0];
  const icebreaker = useMemo(() => pickIcebreaker(), []);

  const previewText = useMemo(
    () =>
      renderSection(script, section, {
        meeting,
        agenda: section === "agendaTransition" ? agenda : undefined,
        icebreaker: section === "icebreaker" ? icebreaker : undefined,
      }),
    [script, section, meeting, agenda, icebreaker],
  );

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const synth = async () => {
    setLoading(true);
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    try {
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          section,
          meeting,
          agenda: section === "agendaTransition" ? agenda : undefined,
          icebreaker: section === "icebreaker" ? icebreaker : undefined,
          rate,
          pitch,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "speech_not_configured") {
          setError(
            "Azure Speech が未設定です。.env.local に AZURE_SPEECH_KEY を設定してください。",
          );
        } else {
          setError(data.error ?? `HTTP ${res.status}`);
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      requestAnimationFrame(() => {
        audioRef.current?.play().catch(() => undefined);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            音声プレビュー
          </h2>
          <p className="text-xs text-slate-500">
            台本を Azure Speech (Neural TTS) で音声化して試聴できます
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            セクション
          </span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as Section)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {(Object.keys(sectionLabels) as Section[]).map((s) => (
              <option key={s} value={s}>
                {sectionLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            話速
          </span>
          <select
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="-15%">遅め (-15%)</option>
            <option value="+0%">標準</option>
            <option value="+10%">やや速め (+10%)</option>
            <option value="+20%">速め (+20%)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            ピッチ
          </span>
          <select
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="-10%">低め</option>
            <option value="+0%">標準</option>
            <option value="+10%">高め</option>
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
        {previewText}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={synth}
          disabled={loading}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {loading ? "合成中…" : "音声を生成して再生"}
        </button>
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="h-9 flex-1"
          />
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}
    </div>
  );
}
