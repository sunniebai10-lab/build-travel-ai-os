import travelConfig from "@/travel.config.json";

export type ExpenseCurrency = string;
export type ExpenseCategory = "Food" | "Transport" | "Hotel" | "Ticket" | "Shopping" | "Other";

export interface UserExpenseInput {
  id: string;
  date: string;
  amount: number;
  currency: ExpenseCurrency;
  category: ExpenseCategory;
  location: string;
  note: string;
  createdAt: string;
}

export interface UserJournalInput {
  id: string;
  date: string;
  city: string;
  photos: string[];
  sentence: string;
  story: string;
  createdAt: string;
}

export interface ActivityCompletionState {
  activity_id: string;
  completed: boolean;
  completed_at: string | null;
  journal_created: boolean;
}

const tripScope = travelConfig.tripId;
const expenseKey = `ai-world-citizen:${tripScope}:user-expenses`;
const journalKey = `ai-world-citizen:${tripScope}:user-journals`;
const activityKey = `ai-world-citizen:${tripScope}:activity-status`;

export const localTravelStorageKeys = { expenseKey, journalKey, activityKey };

export function isValidCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function createInputId(prefix: string) {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

export function getUserExpenses() {
  return readJson<UserExpenseInput[]>(expenseKey, []);
}

export function addUserExpense(expense: UserExpenseInput) {
  const next = [expense, ...getUserExpenses()];
  writeJson(expenseKey, next);
  return next;
}

export function getUserJournals() {
  return readJson<UserJournalInput[]>(journalKey, []);
}

export function addUserJournal(journal: UserJournalInput) {
  const next = [journal, ...getUserJournals()];
  writeJson(journalKey, next);
  return next;
}

export function updateUserJournalStory(journalId: string, story: string) {
  const next = getUserJournals().map((journal) => (journal.id === journalId ? { ...journal, story } : journal));
  writeJson(journalKey, next);
  return next;
}

export function getActivityStatus(activityId: string): ActivityCompletionState {
  const states = readJson<Record<string, ActivityCompletionState>>(activityKey, {});
  return states[activityId] ?? {
    activity_id: activityId,
    completed: false,
    completed_at: null,
    journal_created: false,
  };
}

export function setActivityCompleted(activityId: string, completed: boolean) {
  const states = readJson<Record<string, ActivityCompletionState>>(activityKey, {});
  const next: ActivityCompletionState = {
    activity_id: activityId,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    journal_created: states[activityId]?.journal_created ?? false,
  };
  writeJson(activityKey, { ...states, [activityId]: next });
  return next;
}
