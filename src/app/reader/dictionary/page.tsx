"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  addEntry,
  loadDictionary,
  parseImportedDictionary,
  removeEntry,
  saveDictionary,
  updateEntry,
  type DictionaryEntry,
} from "@/lib/dictionary";

export default function DictionaryPage() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [surface, setSurface] = useState("");
  const [reading, setReading] = useState("");
  const [importMessage, setImportMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEntries(loadDictionary());
  }, []);

  const persist = (next: DictionaryEntry[]) => {
    setEntries(next);
    saveDictionary(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const next = addEntry(entries, surface, reading);
    if (next === entries) return;
    persist(next);
    setSurface("");
    setReading("");
  };

  const handleRemove = (id: string) => {
    persist(removeEntry(entries, id));
  };

  const handleUpdate = (
    id: string,
    field: "surface" | "reading",
    value: string,
  ) => {
    persist(updateEntry(entries, id, field, value));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-reader-dictionary-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const imported = parseImportedDictionary(text);
      if (!imported) {
        setImportMessage("インポートに失敗しました。JSON の形式を確認してください。");
        return;
      }
      if (entries.length > 0) {
        const ok = window.confirm(
          `既存の ${entries.length} 件を上書きして、${imported.length} 件を読み込みますか？`,
        );
        if (!ok) {
          setImportMessage("キャンセルしました");
          return;
        }
      }
      persist(imported);
      setImportMessage(`${imported.length} 件を読み込みました`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">固有名詞辞書</h1>
          <p className="mt-1 text-sm text-slate-600">
            読み間違える表記とよみがなを登録します。読み上げ前に置換されます。
          </p>
        </div>
        <Link
          href="/reader"
          className="text-sm text-slate-600 underline hover:text-slate-900"
        >
          ← 読み上げに戻る
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={entries.length === 0}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          エクスポート
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          インポート
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
        />
        {importMessage && (
          <span className="text-xs text-slate-600">{importMessage}</span>
        )}
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-8 grid grid-cols-1 gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            表記
          </label>
          <input
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="例: 米山"
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            よみがな
          </label>
          <input
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            placeholder="例: よねやま"
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!surface.trim() || !reading.trim()}
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-300 sm:w-auto"
          >
            追加
          </button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          まだ辞書に登録がありません。上のフォームから追加してください。
        </p>
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-2">表記</th>
                <th className="px-4 py-2">よみがな</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-2 py-1">
                    <input
                      value={e.surface}
                      onChange={(ev) =>
                        handleUpdate(e.id, "surface", ev.target.value)
                      }
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium hover:border-slate-300 focus:border-slate-500 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={e.reading}
                      onChange={(ev) =>
                        handleUpdate(e.id, "reading", ev.target.value)
                      }
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 hover:border-slate-300 focus:border-slate-500 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleRemove(e.id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">
        登録件数: {entries.length} 件 / 保存先: このブラウザの localStorage
      </p>
    </main>
  );
}
