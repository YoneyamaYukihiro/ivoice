export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function durationMinutes(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.round((end - start) / 60000);
}

export function relativeStart(iso: string, now = new Date()) {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < -1) return `${Math.abs(diffMin)} 分前に開始`;
  if (diffMin <= 1) return "まもなく開始";
  if (diffMin < 60) return `${diffMin} 分後に開始`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m === 0 ? `${h} 時間後に開始` : `${h} 時間 ${m} 分後に開始`;
}
