export function formatDateRange(startDate: string, endDate: string) {
  return `${startDate} - ${endDate}`;
}

export function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatShortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatTime(time: string | null) {
  if (!time) {
    return "--";
  }
  return time.slice(0, 5);
}

export function parseJsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
