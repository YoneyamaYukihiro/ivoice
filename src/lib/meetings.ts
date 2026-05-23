import {
  GraphApiError,
  GraphConfigError,
  listTodaysMeetings,
  loadGraphConfig,
} from "@/services/graph";
import type { Meeting } from "./types";
import { mockMeetings } from "./mock-data";

export type MeetingsSource = "graph" | "mock";

export type MeetingsResult = {
  source: MeetingsSource;
  meetings: Meeting[];
  notice?: string;
};

export async function getTodaysMeetings(): Promise<MeetingsResult> {
  try {
    const config = loadGraphConfig();
    const live = await listTodaysMeetings(config);
    if (live.length === 0) {
      return {
        source: "graph",
        meetings: [],
        notice: "本日の予定はありません",
      };
    }
    return { source: "graph", meetings: withFallbackAgenda(live) };
  } catch (err) {
    if (err instanceof GraphConfigError) {
      return {
        source: "mock",
        meetings: mockMeetings,
        notice: "Microsoft Graph 未設定のためモックデータを表示しています",
      };
    }
    if (err instanceof GraphApiError) {
      return {
        source: "mock",
        meetings: mockMeetings,
        notice: `Graph API エラー (${err.status}) のためモックにフォールバック`,
      };
    }
    throw err;
  }
}

function withFallbackAgenda(meetings: Meeting[]): Meeting[] {
  return meetings.map((m) =>
    m.agenda.length > 0
      ? m
      : {
          ...m,
          agenda: [
            {
              id: `${m.id}-default`,
              title: "本会議のメイントピック",
              durationMinutes: Math.max(
                5,
                Math.round(
                  (new Date(m.endsAt).getTime() -
                    new Date(m.startsAt).getTime()) /
                    60000,
                ),
              ),
              owner: m.organizer,
            },
          ],
        },
  );
}
