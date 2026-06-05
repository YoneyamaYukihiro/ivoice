"use client";

import { useEffect, useState } from "react";
import {
  isSupported,
  listJapaneseVoices,
  pause,
  resume,
  speak,
  stop,
  type Voice,
} from "@/lib/tts";

export default function ReaderPage() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [rate, setRate] = useState(1.0);
  const [status, setStatus] = useState<"idle" | "speaking" | "paused">("idle");
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(isSupported());
    listJapaneseVoices().then((vs) => {
      setVoices(vs);
      if (vs.length > 0) setVoiceURI(vs[0].uri);
    });
    return () => {
      stop();
    };
  }, []);

  const handleSpeak = () => {
    if (!text.trim()) return;
    setStatus("speaking");
    speak(text, {
      voiceURI: voiceURI || undefined,
      rate,
      onEnd: () => setStatus("idle"),
      onError: () => setStatus("idle"),
    });
  };

  const handlePause = () => {
    pause();
    setStatus("paused");
  };

  const handleResume = () => {
    resume();
    setStatus("speaking");
  };

  const handleStop = () => {
    stop();
    setStatus("idle");
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">voice-reader</h1>
        <p className="mt-1 text-sm text-slate-600">
          貼り付けた文章をブラウザ内蔵の音声合成で読み上げます。
        </p>
      </header>

      {supported === false && (
        <div className="mb-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          このブラウザは Web Speech API に対応していません。Edge または Chrome
          の最新版でお試しください。
        </div>
      )}

      <section className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            読み上げるテキスト
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ここに文章を貼り付けてください"
            className="h-64 w-full resize-y rounded border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-slate-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            {text.length.toLocaleString()} 文字
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              声
            </label>
            <select
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
              disabled={voices.length === 0}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
            >
              {voices.length === 0 && <option>（日本語の声が見つかりません）</option>}
              {voices.map((v) => (
                <option key={v.uri} value={v.uri}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              話速: <span className="font-mono">{rate.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min={0.8}
              max={1.5}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {status !== "speaking" && status !== "paused" && (
            <button
              onClick={handleSpeak}
              disabled={!text.trim() || supported === false}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-300"
            >
              読み上げ
            </button>
          )}
          {status === "speaking" && (
            <button
              onClick={handlePause}
              className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
            >
              一時停止
            </button>
          )}
          {status === "paused" && (
            <button
              onClick={handleResume}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              再開
            </button>
          )}
          {(status === "speaking" || status === "paused") && (
            <button
              onClick={handleStop}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              停止
            </button>
          )}
          <span className="text-xs text-slate-500">
            状態: {status === "idle" ? "待機中" : status === "speaking" ? "再生中" : "一時停止中"}
          </span>
        </div>
      </section>
    </main>
  );
}
