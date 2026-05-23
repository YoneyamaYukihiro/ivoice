import type { ModeratorStatus } from "@/lib/types";

const labels: Record<ModeratorStatus, string> = {
  idle: "待機中",
  joining: "参加中",
  speaking: "発話中",
  listening: "傾聴中",
  leaving: "退出中",
};

const colors: Record<ModeratorStatus, string> = {
  idle: "bg-slate-200 text-slate-700",
  joining: "bg-amber-100 text-amber-800",
  speaking: "bg-emerald-100 text-emerald-800",
  listening: "bg-sky-100 text-sky-800",
  leaving: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status }: { status: ModeratorStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colors[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "speaking"
            ? "animate-pulse bg-emerald-500"
            : status === "idle"
              ? "bg-slate-400"
              : "bg-current"
        }`}
      />
      {labels[status]}
    </span>
  );
}
