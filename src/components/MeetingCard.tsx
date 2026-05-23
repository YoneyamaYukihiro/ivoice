"use client";

import type { Meeting } from "@/lib/types";
import { durationMinutes, formatTime, relativeStart } from "@/lib/format";

type Props = {
  meeting: Meeting;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function MeetingCard({ meeting, selected, onSelect }: Props) {
  const length = durationMinutes(meeting.startsAt, meeting.endsAt);
  return (
    <button
      type="button"
      onClick={() => onSelect(meeting.id)}
      className={`w-full rounded-xl border bg-white p-4 text-left transition hover:border-brand-500 hover:shadow-sm ${
        selected
          ? "border-brand-500 ring-2 ring-brand-100"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900">
            {meeting.subject}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {meeting.organizer} ・ {meeting.source.toUpperCase()}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {length} 分
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-mono text-slate-700">
          {formatTime(meeting.startsAt)} – {formatTime(meeting.endsAt)}
        </span>
        <span className="text-xs text-slate-500">
          {relativeStart(meeting.startsAt)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {meeting.attendees.slice(0, 3).map((a) => (
          <span
            key={a}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
          >
            {a}
          </span>
        ))}
        {meeting.attendees.length > 3 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            +{meeting.attendees.length - 3}
          </span>
        )}
      </div>
    </button>
  );
}
