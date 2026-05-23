import type { AgendaItem, Icebreaker, Meeting, ModeratorScript } from "./types";
import { durationMinutes } from "./format";

export type TemplateContext = {
  meeting: Meeting;
  agenda?: AgendaItem;
  icebreaker?: Icebreaker;
};

export type ScriptSection = keyof ModeratorScript;

const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9.]*)\s*\}\}/g;

function resolve(path: string, ctx: TemplateContext): string {
  const segments = path.split(".");
  // Build a lookup table for known paths. Unknown paths are left as-is.
  switch (segments.join(".")) {
    case "meeting.subject":
      return ctx.meeting.subject;
    case "meeting.organizer":
      return ctx.meeting.organizer;
    case "meeting.durationMinutes":
      return String(durationMinutes(ctx.meeting.startsAt, ctx.meeting.endsAt));
    case "attendees.count":
      return String(ctx.meeting.attendees.length);
    case "agenda.title":
      return ctx.agenda?.title ?? "";
    case "agenda.owner":
      return ctx.agenda?.owner ?? "全員";
    case "agenda.durationMinutes":
      return ctx.agenda ? String(ctx.agenda.durationMinutes) : "";
    case "icebreaker.text":
      return ctx.icebreaker?.text ?? "";
    default:
      return `{{${path}}}`;
  }
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(PLACEHOLDER, (_, path: string) => resolve(path, ctx));
}

export function renderSection(
  script: ModeratorScript,
  section: ScriptSection,
  ctx: TemplateContext,
): string {
  return renderTemplate(script[section], ctx);
}
