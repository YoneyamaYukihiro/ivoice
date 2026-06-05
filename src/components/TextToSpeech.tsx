"use client";

import { useEffect, useRef, useState } from "react";

const MAX_LENGTH = 5000;

export function TextToSpeech() {
  const [text, setText] = useState("");
  const [rate, setRate] = useState("+0%");
  const [pitch, setPitch] = useState("+0%");
  const [style, setStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const synth = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("テキストを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          rate,
          pitch,
          style: style || undefined,
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
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          テキスト読みあげ
        </h2>
        <p className="text-xs text-slate-500">
          自由に入力したテキストを Azure Speech (Neural TTS) で読みあげます
        </p>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          読みあげるテキスト ({text.length}/{MAX_LENGTH})
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          rows={6}
          placeholder="ここにテキストを入力してください"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </label>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            スタイル
          </span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">標準</option>
            <option value="cheerful">明るい</option>
            <option value="customerservice">丁寧</option>
            <option value="chat">カジュアル</option>
            <option value="newscast">ニュース調</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={synth}
          disabled={loading || !text.trim()}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {loading ? "合成中…" : "音声を生成して再生"}
        </button>
        {audioUrl && (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="h-9 flex-1"
            />
            <a
              href={audioUrl}
              download="tts.mp3"
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ダウンロード
            </a>
          </>
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
