"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  addMember,
  bulkAddFromCsv,
  clearSelf,
  HONORIFIC_OPTIONS,
  loadMembers,
  removeMember,
  saveMembers,
  setSelf,
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
                  <td className="px-4 py-2 font-medium">{m.surface}</td>
                  <td className="px-4 py-2 text-slate-700">{m.reading}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {m.isSelf ? "（敬称なし）" : m.honorific || "—"}
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
