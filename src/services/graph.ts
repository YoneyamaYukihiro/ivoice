import type { Meeting } from "@/lib/types";

export type GraphConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  userId: string;
  calendarId?: string;
};

export class GraphConfigError extends Error {}
export class GraphApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message);
  }
}

export function loadGraphConfig(): GraphConfig {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const userId = process.env.GRAPH_USER_ID;
  const calendarId = process.env.GRAPH_CALENDAR_ID || undefined;

  if (!tenantId || !clientId || !clientSecret || !userId) {
    throw new GraphConfigError(
      "Microsoft Graph credentials are not set. Configure AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / GRAPH_USER_ID in .env.local.",
    );
  }
  return { tenantId, clientId, clientSecret, userId, calendarId };
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

async function acquireToken(config: GraphConfig): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.token;
  }
  const endpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GraphApiError(
      `Token acquisition failed: ${res.status} ${res.statusText}`,
      res.status,
      text,
    );
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  return json.access_token;
}

type GraphEvent = {
  id: string;
  subject: string;
  organizer?: { emailAddress?: { name?: string; address?: string } };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{
    emailAddress?: { name?: string; address?: string };
    type?: string;
  }>;
  onlineMeeting?: { joinUrl?: string };
  isOnlineMeeting?: boolean;
  bodyPreview?: string;
};

function toIsoUtc(dateTime: string, timeZone: string): string {
  // Graph returns dateTime without offset; treat as the given zone and convert to ISO UTC.
  // For UTC, just append Z. For other zones, fall back to original string + assume client renders local.
  if (timeZone === "UTC") {
    return dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`;
  }
  // The dateTime has no offset; constructing Date treats it as local. Append Z so it's parseable; consumers format as local.
  return dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`;
}

function todayWindow(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function eventToMeeting(ev: GraphEvent): Meeting {
  const attendees = (ev.attendees ?? [])
    .map((a) => a.emailAddress?.name || a.emailAddress?.address)
    .filter((v): v is string => Boolean(v));
  return {
    id: ev.id,
    subject: ev.subject || "(件名なし)",
    organizer: ev.organizer?.emailAddress?.name ?? ev.organizer?.emailAddress?.address ?? "(主催者不明)",
    startsAt: toIsoUtc(ev.start.dateTime, ev.start.timeZone),
    endsAt: toIsoUtc(ev.end.dateTime, ev.end.timeZone),
    attendees,
    joinUrl: ev.onlineMeeting?.joinUrl,
    source: "spo",
    status: "scheduled",
    agenda: [],
  };
}

export async function listTodaysMeetings(
  config: GraphConfig,
): Promise<Meeting[]> {
  const token = await acquireToken(config);
  const { start, end } = todayWindow();
  const calendarSegment = config.calendarId
    ? `/calendars/${encodeURIComponent(config.calendarId)}`
    : "";
  const url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.userId)}${calendarSegment}/calendarView` +
    `?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}` +
    `&$select=id,subject,organizer,start,end,attendees,onlineMeeting,isOnlineMeeting,bodyPreview` +
    `&$orderby=start/dateTime&$top=50`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="UTC"',
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GraphApiError(
      `Calendar view fetch failed: ${res.status} ${res.statusText}`,
      res.status,
      text,
    );
  }
  const json = (await res.json()) as { value: GraphEvent[] };
  return json.value.map(eventToMeeting);
}
