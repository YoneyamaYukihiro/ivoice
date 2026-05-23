export type CallEntry = {
  callConnectionId: string;
  meetingId: string;
  startedAt: number;
  mode: "live" | "simulated";
  lastEvent?: string;
};

type Store = Map<string, CallEntry>;

declare global {
  // eslint-disable-next-line no-var
  var __ivoiceCallStore: Store | undefined;
}

function store(): Store {
  if (!globalThis.__ivoiceCallStore) {
    globalThis.__ivoiceCallStore = new Map();
  }
  return globalThis.__ivoiceCallStore;
}

export function setCall(entry: CallEntry): void {
  store().set(entry.meetingId, entry);
}

export function getCall(meetingId: string): CallEntry | undefined {
  return store().get(meetingId);
}

export function removeCall(meetingId: string): void {
  store().delete(meetingId);
}

export function findByConnectionId(
  callConnectionId: string,
): CallEntry | undefined {
  for (const entry of store().values()) {
    if (entry.callConnectionId === callConnectionId) return entry;
  }
  return undefined;
}

export function annotateEvent(
  callConnectionId: string,
  eventType: string,
): void {
  const entry = findByConnectionId(callConnectionId);
  if (entry) {
    entry.lastEvent = eventType;
    store().set(entry.meetingId, entry);
  }
}
