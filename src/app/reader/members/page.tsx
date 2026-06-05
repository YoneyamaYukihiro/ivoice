"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  addMember,
  bulkAddFromCsv,
  clearSelf,
  HONORIFIC_OPTIONS,
  loadMembers,
  parseImportedMembers,
  removeMember,
  saveMembers,
  setSelf,
  updateMember,
  type Honorific,
  type Member,
} from "@/lib/members";

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [surface, setSurface] = useState("");
  const [reading, setReading] = useState("");
  const [honorific, setHonorific] = useState<Honorific>("さん");
  const [csv, setCsv] = useState("");
  const [bulkResult, setBulkResult] = useState<string>("");
  const [importMessage, setImportMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMembers(loadMembers());
  }, []);

  const persist = (next: Member[]) => {
    setMembers(next);
    saveMembers(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const next = addMember(members, surface, reading, honorific);
    if (next === members) return;
    persist(next);
    setSurface("");
    setReading("");
  };

  const handleRemove = (id: string) => {
    persist(removeMember(members, id));
  };

  const handleToggleSelf = (id: string) => {
    const target = members.find((m) => m.id === id);
    persist(target?.isSelf ? clearSelf(members) : setSelf(members, id));
  };

  const handleUpdateField = (
    id: string,
    field: "surface" | "reading" | "honorific",
    value: string,
  ) => {
    if (field === "honorific") {
      persist(updateMember(members, id, { honorific: value as Honorific }));
    } else {
      persist(updateMember(members, id, { [field]: value }));
    }
  };

  const handleBulk = () => {
    const { next, added, skipped } = bulkAddFromCsv(members, csv);
    persist(next);
    setCsv("");
    setBulkResult(
      added === 0
        ? "追加できる行がありませんでした"
        : `${added} 件追加${skipped > 0 ? `、${skipped} 件スキップ` : ""}`,
    );
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(members, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-reader-members-${new Date()
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
      const imported = parseImportedMembers(text);
      if (!imported) {
        setImportMessage("インポートに失敗しました。JSON の形式を確認してください。");
        return;
      }
      if (members.length > 0) {
        const ok = window.confirm(
          `既存の ${members.length} 件を上書きして、${imported.length} 件を読み込みますか？`,
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
          <h1 className="text-2xl font-bold tracking-tight">メンバー名簿</h1>
          <p className="mt-1 text-sm text-slate-600">
            氏名・よみ・敬称を登録。読み上げ時に「氏名」を「よみがな + 敬称」に置換します。
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
          disabled={members.length === 0}
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
        className="mb-6 grid grid-cols-1 gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto_auto]"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            氏名
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
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            敬称
          </label>
          <select
            value={honorific}
            onChange={(e) => setHonorific(e.target.value as Honorific)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {HONORIFIC_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h || "（なし）"}
              </option>
            ))}
          </select>
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

      <details className="mb-6 rounded border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          メンバーを一括追加（CSV）
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-600">
            1 行 1 名。形式は「氏名,よみがな,敬称」。敬称は省略可（デフォルト
            さん）。
          </p>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={"水口,みずぐち\n浅川,あさかわ\n里見,さとみ,くん"}
            className="h-32 w-full resize-y rounded border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBulk}
              disabled={!csv.trim()}
              className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:bg-slate-300"
            >
              一括追加
            </button>
            {bulkResult && (
              <span className="text-xs text-slate-600">{bulkResult}</span>
            )}
          </div>
        </div>
      </details>

      {members.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          まだメンバーが登録されていません。
        </p>
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-2">氏名</th>
                <th className="px-4 py-2">よみがな</th>
                <th className="px-4 py-2">敬称</th>
                <th className="px-4 py-2 text-center">自分</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className={`border-t border-slate-100 ${m.isSelf ? "bg-sky-50" : ""}`}
                >
                  <td className="px-2 py-1">
                    <input
                      value={m.surface}
                      onChange={(ev) =>
                        handleUpdateField(m.id, "surface", ev.target.value)
                      }
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium hover:border-slate-300 focus:border-slate-500 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={m.reading}
                      onChange={(ev) =>
                        handleUpdateField(m.id, "reading", ev.target.value)
                      }
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 hover:border-slate-300 focus:border-slate-500 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1">
                    {m.isSelf ? (
                      <span className="text-xs text-slate-500">
                        （敬称なし）
                      </span>
                    ) : (
                      <select
                        value={m.honorific}
                        onChange={(ev) =>
                          handleUpdateField(m.id, "honorific", ev.target.value)
                        }
                        className="rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 hover:border-slate-300 focus:border-slate-500 focus:bg-white focus:outline-none"
                      >
                        {HONORIFIC_OPTIONS.map((h) => (
                          <option key={h} value={h}>
                            {h || "（なし）"}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(m.isSelf)}
                      onChange={() => handleToggleSelf(m.id)}
                      title="チェックすると読み上げ時に敬称が付かなくなります（自分自身用）"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleRemove(m.id)}
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
        登録件数: {members.length} 件 / 保存先: このブラウザの localStorage
      </p>
    </main>
  );
}
