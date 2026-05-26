"use client";

import { useEffect, useRef, useState } from "react";

const MAX_TEXT_LENGTH = 10000;

export function TextReader() {
  const [text, setText] = useState("");
  const [rate, setRate] = useState("+0%");
  const [pitch, setPitch] = useState("+0%");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const speak = async () => {
    if (!text.trim()) {
      setError("読み上げるテキストを入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    try {
      const res = await fetch("/api/speech/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, rate, pitch }),
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
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          テキスト読み上げ
        </h2>
        <p className="text-xs text-slate-500">
          貼り付けたテキストを Azure Speech (Neural TTS) で読み上げます
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_TEXT_LENGTH}
        rows={6}
        placeholder="ここにテキストを貼り付けてください…"
        className="mt-4 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <div className="mt-1 text-right text-xs text-slate-400">
        {text.length} / {MAX_TEXT_LENGTH}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={speak}
          disabled={loading}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {loading ? "合成中…" : "読み上げる"}
        </button>
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} controls className="h-9 flex-1" />
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
