import type { AgendaItem } from "@/lib/types";

type Props = {
  items: AgendaItem[];
  activeId?: string;
};

export function AgendaList({ items, activeId }: Props) {
  return (
    <ol className="space-y-2">
      {items.map((item, idx) => {
        const active = item.id === activeId;
        return (
          <li
            key={item.id}
            className={`flex items-start gap-3 rounded-lg border p-3 transition ${
              active
                ? "border-brand-500 bg-brand-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? "bg-brand-500 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                <span className="shrink-0 text-xs text-slate-500">
                  {item.durationMinutes} 分
                </span>
              </div>
              {item.owner && (
                <p className="mt-0.5 text-xs text-slate-500">
                  担当: {item.owner}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
