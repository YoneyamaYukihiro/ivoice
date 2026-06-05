"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cleanupForReading } from "@/lib/cleanup";
import { loadDictionary, type DictionaryEntry } from "@/lib/dictionary";
import { loadMembers, type Member } from "@/lib/members";
import { applyMembers } from "@/lib/members-apply";
import { normalizeForSpeak } from "@/lib/normalize";
import {
  applyPlaceholders,
  BUILTIN_KEYS,
  defaultValueFor,
  extractPlaceholders,
  isTextareaPlaceholder,
  PERSON_KEYS,
} from "@/lib/placeholders";
import { applyDictionary } from "@/lib/replace";
import { parseSections } from "@/lib/sections";
import {
  loadTemplates,
  parseImportedTemplates,
  removeTemplate,
  saveTemplates,
  upsertTemplate,
  type Template,
} from "@/lib/templates";
import {
  isSupported,
  listJapaneseVoices,
  pause,
  resume,
  speak,
  stop,
  type Voice,
} from "@/lib/tts";
import { APP_VERSION } from "@/lib/version";

type Status = "idle" | "speaking" | "paused" | "hosting" | "between";

export default function ReaderPage() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [rate, setRate] = useState(1.1);
  const [pauseSec, setPauseSec] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(-1);
  const [placeholderValues, setPlaceholderValues] = useState<
    Record<string, string>
  >({});

  const stoppedRef = useRef(false);
  const advanceRef = useRef<(() => void) | null>(null);
  const rateRef = useRef(rate);
  const voiceURIRef = useRef(voiceURI);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const [templateImportMessage, setTemplateImportMessage] = useState<string>("");

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    voiceURIRef.current = voiceURI;
  }, [voiceURI]);

  useEffect(() => {
    setSupported(isSupported());
    setDictionary(loadDictionary());
    setMembers(loadMembers());
    setTemplates(loadTemplates());
    listJapaneseVoices().then((vs) => {
      setVoices(vs);
      if (vs.length > 0) setVoiceURI(vs[0].uri);
    });
    return () => {
      stoppedRef.current = true;
      stop();
    };
  }, []);

  const placeholders = useMemo(() => extractPlaceholders(text), [text]);

  useEffect(() => {
    setPlaceholderValues((prev) => {
      const next: Record<string, string> = {};
      for (const key of placeholders) {
        if (prev[key] !== undefined) {
          next[key] = prev[key];
        } else if (BUILTIN_KEYS.includes(key)) {
          next[key] = defaultValueFor(key);
        } else {
          next[key] = "";
        }
      }
      return next;
    });
  }, [placeholders]);

  const renderedText = useMemo(() => {
    const afterTextarea = applyPlaceholders(
      text,
      placeholderValues,
      isTextareaPlaceholder,
    );
    const presenterSurfaces = new Set(
      PERSON_KEYS.map((k) => placeholderValues[k]).filter(
        (v): v is string => Boolean(v),
      ),
    );
    const effectiveMembers = presenterSurfaces.size
      ? members.map((m) =>
          presenterSurfaces.has(m.surface) ? { ...m, isSelf: true } : m,
        )
      : members;
    const afterMembers = applyMembers(afterTextarea, effectiveMembers);
    return applyPlaceholders(
      afterMembers,
      placeholderValues,
      (k) => !isTextareaPlaceholder(k),
    );
  }, [text, members, placeholderValues]);
  const sections = useMemo(
    () => parseSections(renderedText),
    [renderedText],
  );
  const spokenSections = useMemo(
    () =>
      sections.map((s) => ({
        title: normalizeForSpeak(applyDictionary(s.title, dictionary)),
        body: normalizeForSpeak(applyDictionary(s.body, dictionary)),
      })),
    [sections, dictionary],
  );
  const hasMultipleSections = sections.length > 1;
  const hasUnfilledPlaceholders = placeholders.some(
    (k) => !placeholderValues[k] || placeholderValues[k].length === 0,
  );

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setText(t.text);
  };

  const handleSave = () => {
    const defaultName = selectedTemplate?.name ?? "";
    const name = window.prompt("テンプレ名を入力", defaultName);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = templates.find((t) => t.name === trimmed);
    if (existing && existing.id !== selectedTemplate?.id) {
      const ok = window.confirm(`「${trimmed}」は既にあります。上書きしますか？`);
      if (!ok) return;
    }
    const { next, saved } = upsertTemplate(templates, trimmed, text);
    setTemplates(next);
    saveTemplates(next);
    setSelectedTemplateId(saved.id);
  };

  const handleDeleteTemplate = () => {
    if (!selectedTemplate) return;
    const ok = window.confirm(`「${selectedTemplate.name}」を削除しますか？`);
    if (!ok) return;
    const next = removeTemplate(templates, selectedTemplate.id);
    setTemplates(next);
    saveTemplates(next);
    setSelectedTemplateId("");
  };

  const handleExportTemplates = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-reader-templates-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const imported = parseImportedTemplates(text);
      if (!imported) {
        setTemplateImportMessage(
          "インポートに失敗しました。JSON の形式を確認してください。",
        );
        return;
      }
      if (templates.length > 0) {
        const ok = window.confirm(
          `既存の ${templates.length} 件を上書きして、${imported.length} 件を読み込みますか？`,
        );
        if (!ok) {
          setTemplateImportMessage("キャンセルしました");
          return;
        }
      }
      setTemplates(imported);
      saveTemplates(imported);
      setSelectedTemplateId("");
      setTemplateImportMessage(`${imported.length} 件を読み込みました`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSpeak = () => {
    if (!renderedText.trim()) return;
    setStatus("speaking");
    const replaced = normalizeForSpeak(
      applyDictionary(renderedText, dictionary),
    );
    speak(replaced, {
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
    stoppedRef.current = true;
    stop();
    advanceRef.current?.();
    advanceRef.current = null;
    setStatus("idle");
    setCurrentSectionIndex(-1);
  };

  const speakAsync = (body: string) =>
    new Promise<void>((resolve) => {
      const replaced = normalizeForSpeak(
        applyDictionary(body, dictionary),
      );
      speak(replaced, {
        voiceURI: voiceURIRef.current || undefined,
        rate: rateRef.current,
        onEnd: () => resolve(),
        onError: () => resolve(),
      });
    });

  const waitWithAdvance = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        advanceRef.current = null;
        resolve();
      }, ms);
      advanceRef.current = () => {
        window.clearTimeout(timer);
        advanceRef.current = null;
        resolve();
      };
    });

  const handleHostMode = async () => {
    if (sections.length === 0) return;
    stoppedRef.current = false;
    for (let i = 0; i < sections.length; i++) {
      if (stoppedRef.current) break;
      setCurrentSectionIndex(i);
      setStatus("speaking");
      await speakAsync(sections[i].body);
      if (stoppedRef.current) break;
      if (i < sections.length - 1) {
        setStatus("between");
        await waitWithAdvance(pauseSec * 1000);
      }
    }
    setStatus("idle");
    setCurrentSectionIndex(-1);
  };

  const handleAdvance = () => {
    advanceRef.current?.();
  };

  const isBusy = status === "speaking" || status === "paused" || status === "between";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            AI-Voice司会くん{" "}
            <span className="ml-1 align-middle text-xs font-normal text-slate-500">
              v{APP_VERSION}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            貼り付けた文章をブラウザ内蔵の音声合成で読み上げます。
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">
              # 見出し でセクション分け
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link
            href="/reader/members"
            className="text-slate-600 underline hover:text-slate-900"
          >
            メンバー ({members.length})
          </Link>
          <Link
            href="/reader/dictionary"
            className="text-slate-600 underline hover:text-slate-900"
          >
            辞書 ({dictionary.length})
          </Link>
        </div>
      </header>

      {supported === false && (
        <div className="mb-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          このブラウザは Web Speech API に対応していません。Edge または Chrome
          の最新版でお試しください。
        </div>
      )}

      <section className="space-y-5">
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                保存した台本
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">— 選択してください —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={!text.trim() || isBusy}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-300"
            >
              現在を保存
            </button>
            {selectedTemplate && (
              <button
                onClick={handleDeleteTemplate}
                disabled={isBusy}
                className="rounded border border-rose-300 bg-white px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                削除
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={handleExportTemplates}
              disabled={templates.length === 0 || isBusy}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              エクスポート (JSON)
            </button>
            <button
              type="button"
              onClick={() => templateFileInputRef.current?.click()}
              disabled={isBusy}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              インポート
            </button>
            <input
              ref={templateFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportTemplates}
              className="hidden"
            />
            {templateImportMessage && (
              <span className="text-xs text-slate-600">
                {templateImportMessage}
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">
              読み上げるテキスト
            </label>
            <button
              type="button"
              onClick={() => setText((t) => cleanupForReading(t))}
              disabled={!text.trim() || isBusy}
              title="チャットの見出しに # を付け、太字記号や箇条書きを整理"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              チャットを整形
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"ここに文章を貼り付けてください\n\n# 見出し と書くと司会モードでセクション分けされます"}
            className="h-64 w-full resize-y rounded border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-slate-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            {text.length.toLocaleString()} 文字
            {sections.length > 0 && ` / ${sections.length} セクション`}
            {placeholders.length > 0 && ` / ${placeholders.length} プレースホルダ`}
          </p>
        </div>

        {placeholders.length > 0 && (
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-medium text-slate-700">
              プレースホルダ
              {hasUnfilledPlaceholders && (
                <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 font-normal text-slate-600">
                  空欄は飛ばされます
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {placeholders.map((key) => {
                const isBuiltin = BUILTIN_KEYS.includes(key);
                const isPerson = PERSON_KEYS.includes(key);
                const useMemberSelect = isPerson && members.length > 0;
                const useTextarea = isTextareaPlaceholder(key);
                if (useTextarea) {
                  const isEmpty = !placeholderValues[key];
                  return (
                    <div key={key} className="sm:col-span-2">
                      <div className="mb-1 flex items-center gap-2">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs">
                          {`{${key}}`}
                        </code>
                        <span className="text-xs text-slate-500">
                          複数行 OK / チャットをそのまま貼れます
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPlaceholderValues((prev) => ({
                              ...prev,
                              [key]: cleanupForReading(prev[key] ?? ""),
                            }))
                          }
                          disabled={isEmpty}
                          title="チャットの太字・箇条書きを整理、見出し検出"
                          className="ml-auto rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          チャットを整形
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPlaceholderValues((prev) => ({
                              ...prev,
                              [key]: "",
                            }))
                          }
                          disabled={isEmpty}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          クリア
                        </button>
                      </div>
                      <textarea
                        value={placeholderValues[key] ?? ""}
                        onChange={(e) =>
                          setPlaceholderValues((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={"ここに貼り付け"}
                        className="h-32 w-full resize-y rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                      />
                    </div>
                  );
                }
                return (
                  <div key={key} className="flex items-center gap-2">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs">
                      {`{${key}}`}
                    </code>
                    {useMemberSelect ? (
                      <select
                        value={placeholderValues[key] ?? ""}
                        onChange={(e) =>
                          setPlaceholderValues((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                      >
                        <option value="">— メンバーを選択 —</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.surface}>
                            {m.surface}（{m.reading}）
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={placeholderValues[key] ?? ""}
                        onChange={(e) =>
                          setPlaceholderValues((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={
                          isBuiltin
                            ? "自動入力済み"
                            : isPerson
                              ? "メンバー未登録のため手動入力"
                              : "値を入力"
                        }
                        className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              組み込み: {"{date}"} {"{today}"} {"{date_full}"} {"{weekday}"} {"{time}"}
            </p>
          </div>
        )}

        {sections.length > 0 && (
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-medium text-slate-700">
              セクション一覧
            </p>
            <ol className="space-y-1 text-sm">
              {sections.map((s, i) => {
                const isCurrent = i === currentSectionIndex;
                return (
                  <li
                    key={i}
                    className={`flex items-baseline gap-2 rounded px-2 py-1 ${
                      isCurrent ? "bg-emerald-100 font-medium" : ""
                    }`}
                  >
                    <span className="font-mono text-xs text-slate-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium">{s.title || "(無題)"}</span>
                    <span className="truncate text-xs text-slate-500">
                      {s.body.slice(0, 40)}
                      {s.body.length > 40 ? "…" : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {sections.length > 0 && (
          <details className="rounded border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-700">
              実際に読み上げられる全文プレビュー（辞書・正規化済み）
            </summary>
            <ol className="mt-3 space-y-3 text-sm">
              {spokenSections.map((s, i) => (
                <li key={i}>
                  <div className="font-mono text-xs text-slate-500">
                    {String(i + 1).padStart(2, "0")}
                    {s.title ? ` ${s.title}` : ""}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-slate-700">
                    {s.body}
                  </div>
                </li>
              ))}
            </ol>
          </details>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              min={0.5}
              max={1.5}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              セクション間の間: <span className="font-mono">{pauseSec}秒</span>
            </label>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={pauseSec}
              onChange={(e) => setPauseSec(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {status === "idle" && (
            <>
              <button
                onClick={handleSpeak}
                disabled={!text.trim() || supported === false}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-300"
              >
                通常読み上げ
              </button>
              {hasMultipleSections && (
                <button
                  onClick={handleHostMode}
                  disabled={supported === false}
                  className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:bg-slate-300"
                >
                  司会モードで再生 ({sections.length} セクション)
                </button>
              )}
              {hasUnfilledPlaceholders && (
                <span className="text-xs text-slate-500">
                  ※ 空欄のプレースホルダは飛ばされます
                </span>
              )}
            </>
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
          {status === "between" && (
            <button
              onClick={handleAdvance}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              次のセクションへ →
            </button>
          )}
          {isBusy && (
            <button
              onClick={handleStop}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              停止
            </button>
          )}
          <span className="text-xs text-slate-500">
            状態:{" "}
            {status === "idle"
              ? "待機中"
              : status === "speaking"
                ? `再生中${currentSectionIndex >= 0 ? ` (${currentSectionIndex + 1}/${sections.length})` : ""}`
                : status === "paused"
                  ? "一時停止中"
                  : `セクション間 (${pauseSec}秒)`}
          </span>
        </div>
      </section>
    </main>
  );
}
