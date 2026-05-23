import { GraphApiError, type GraphConfig } from "./graph";

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

export type PostTarget =
  | { kind: "channel"; teamId: string; channelId: string }
  | { kind: "chat"; chatId: string }
  | { kind: "none" };

export function loadPostTarget(): PostTarget {
  const mode = (process.env.MINUTES_POST_MODE ?? "none").toLowerCase();
  if (mode === "channel") {
    const teamId = process.env.MINUTES_TEAM_ID;
    const channelId = process.env.MINUTES_CHANNEL_ID;
    if (!teamId || !channelId) return { kind: "none" };
    return { kind: "channel", teamId, channelId };
  }
  if (mode === "chat") {
    const chatId = process.env.MINUTES_CHAT_ID;
    if (!chatId) return { kind: "none" };
    return { kind: "chat", chatId };
  }
  return { kind: "none" };
}

function markdownToHtml(md: string): string {
  // Very small markdown subset to HTML for Teams message content.
  const lines = md.split("\n");
  const out: string[] = [];
  let listOpen = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      if (listOpen) {
        out.push("</ul>");
        listOpen = false;
      }
      out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      if (listOpen) {
        out.push("</ul>");
        listOpen = false;
      }
      out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith("- ")) {
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    } else if (line === "") {
      if (listOpen) {
        out.push("</ul>");
        listOpen = false;
      }
    } else {
      if (listOpen) {
        out.push("</ul>");
        listOpen = false;
      }
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  if (listOpen) out.push("</ul>");
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function postMinutes(
  config: GraphConfig,
  target: PostTarget,
  subject: string,
  markdown: string,
): Promise<{ url?: string }> {
  if (target.kind === "none") {
    throw new GraphApiError(
      "MINUTES_POST_MODE is 'none'. Set channel or chat target in .env.local.",
      400,
      "",
    );
  }
  const token = await acquireToken(config);
  const html = `<h1>${escapeHtml(subject)} 議事録</h1>${markdownToHtml(markdown)}`;
  const url =
    target.kind === "channel"
      ? `https://graph.microsoft.com/v1.0/teams/${target.teamId}/channels/${target.channelId}/messages`
      : `https://graph.microsoft.com/v1.0/chats/${target.chatId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      body: { contentType: "html", content: html },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new GraphApiError(
      `Post minutes failed: ${res.status} ${res.statusText}`,
      res.status,
      text,
    );
  }
  const data = (await res.json()) as { webUrl?: string };
  return { url: data.webUrl };
}
