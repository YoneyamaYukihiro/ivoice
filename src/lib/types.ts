export type MeetingStatus = "scheduled" | "in_progress" | "completed";

export type ModeratorStatus =
  | "idle"
  | "joining"
  | "speaking"
  | "listening"
  | "leaving";

export type AgendaItem = {
  id: string;
  title: string;
  durationMinutes: number;
  owner?: string;
  notes?: string;
};

export type Meeting = {
  id: string;
  subject: string;
  organizer: string;
  startsAt: string;
  endsAt: string;
  attendees: string[];
  joinUrl?: string;
  source: "spo" | "exchange" | "manual";
  status: MeetingStatus;
  agenda: AgendaItem[];
};

export type ModeratorScript = {
  opening: string;
  agendaTransition: string;
  timeWarning: string;
  closing: string;
  icebreaker: string;
};

export type IcebreakerCategory = "dajare" | "trivia" | "weather" | "tech";

export type Icebreaker = {
  id: string;
  category: IcebreakerCategory;
  text: string;
};

export type IcebreakerTiming = "opening" | "agendaTransition" | "closing" | "manual";
