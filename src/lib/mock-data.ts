import type { Meeting, ModeratorScript } from "./types";

const today = new Date();
const at = (hour: number, minute = 0) => {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const mockMeetings: Meeting[] = [
  {
    id: "mtg-001",
    subject: "週次プロダクト定例",
    organizer: "山田 太郎",
    startsAt: at(10, 0),
    endsAt: at(10, 45),
    attendees: ["山田 太郎", "佐藤 花子", "鈴木 一郎", "高橋 美咲"],
    joinUrl: "https://teams.microsoft.com/l/meetup-join/...",
    source: "spo",
    status: "scheduled",
    agenda: [
      { id: "a1", title: "前回アクションアイテム確認", durationMinutes: 5, owner: "山田 太郎" },
      { id: "a2", title: "今週の進捗共有", durationMinutes: 15, owner: "全員" },
      { id: "a3", title: "次期リリース計画", durationMinutes: 20, owner: "佐藤 花子" },
      { id: "a4", title: "クロージング / 次回確認", durationMinutes: 5, owner: "山田 太郎" },
    ],
  },
  {
    id: "mtg-002",
    subject: "顧客フィードバック レビュー",
    organizer: "鈴木 一郎",
    startsAt: at(13, 30),
    endsAt: at(14, 0),
    attendees: ["鈴木 一郎", "高橋 美咲", "田中 健"],
    joinUrl: "https://teams.microsoft.com/l/meetup-join/...",
    source: "spo",
    status: "scheduled",
    agenda: [
      { id: "b1", title: "アンケート結果サマリ", durationMinutes: 10, owner: "高橋 美咲" },
      { id: "b2", title: "改善提案ディスカッション", durationMinutes: 15, owner: "全員" },
      { id: "b3", title: "次のアクション", durationMinutes: 5, owner: "鈴木 一郎" },
    ],
  },
  {
    id: "mtg-003",
    subject: "新人オンボーディング Q&A",
    organizer: "高橋 美咲",
    startsAt: at(16, 0),
    endsAt: at(16, 30),
    attendees: ["高橋 美咲", "新人A", "新人B"],
    joinUrl: "https://teams.microsoft.com/l/meetup-join/...",
    source: "exchange",
    status: "scheduled",
    agenda: [
      { id: "c1", title: "自己紹介", durationMinutes: 10, owner: "全員" },
      { id: "c2", title: "質疑応答", durationMinutes: 20, owner: "高橋 美咲" },
    ],
  },
];

export const defaultScript: ModeratorScript = {
  opening:
    "皆さん、お疲れさまです。{{meeting.subject}} を始めます。本日の参加者は {{attendees.count}} 名、予定時間は {{meeting.durationMinutes}} 分です。アジェンダに沿って進めてまいります。",
  agendaTransition:
    "続いて、「{{agenda.title}}」に移ります。担当は {{agenda.owner}} さんです。所要時間 {{agenda.durationMinutes}} 分を目安にお願いします。",
  timeWarning:
    "残り 1 分です。次の議題に進む準備をお願いします。",
  closing:
    "本日の議事は以上です。決定事項とアクションアイテムは議事録にまとめます。ご参加ありがとうございました。",
  icebreaker:
    "本題に入る前に、一言だけ。{{icebreaker.text}}",
};
