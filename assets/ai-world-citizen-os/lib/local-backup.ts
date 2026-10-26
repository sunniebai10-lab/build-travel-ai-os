import travelConfig from "@/travel.config.json";
import { localGuestItineraryCacheKey, itineraryCategories, type UserItineraryRecord } from "@/lib/supabase/user-itinerary";
import { isValidCalendarDate, localTravelStorageKeys, type ActivityCompletionState, type UserExpenseInput, type UserJournalInput } from "@/lib/user-input-store";

const format = "aiwc-local-backup";
const guestId = "local-guest";
const expenseCategories = ["Food", "Transport", "Hotel", "Ticket", "Shopping", "Other"];

interface LocalBackup {
  format: typeof format;
  version: 1;
  tripId: string;
  exportedAt: string;
  expenses: UserExpenseInput[];
  journals: UserJournalInput[];
  activityStatus: Record<string, ActivityCompletionState>;
  guestItinerary: UserItineraryRecord[];
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string";
}

function nonempty(value: unknown): value is string {
  return text(value) && value.trim().length > 0;
}

function optionalText(value: unknown): value is string | null {
  return value === null || text(value);
}

function date(value: unknown): value is string {
  return text(value) && isValidCalendarDate(value);
}

function timestamp(value: unknown): value is string {
  return text(value) && !Number.isNaN(Date.parse(value));
}

function expense(value: unknown): value is UserExpenseInput {
  return object(value) && nonempty(value.id) && date(value.date) && typeof value.amount === "number" &&
    Number.isFinite(value.amount) && value.amount > 0 && nonempty(value.currency) &&
    expenseCategories.includes(String(value.category)) && text(value.location) && text(value.note) && timestamp(value.createdAt);
}

function journal(value: unknown): value is UserJournalInput {
  return object(value) && nonempty(value.id) && date(value.date) && nonempty(value.city) &&
    Array.isArray(value.photos) && value.photos.every(text) && text(value.sentence) && text(value.story) && timestamp(value.createdAt);
}

function activity(value: unknown): value is ActivityCompletionState {
  return object(value) && nonempty(value.activity_id) && typeof value.completed === "boolean" &&
    (value.completed_at === null || timestamp(value.completed_at)) && typeof value.journal_created === "boolean";
}

function guestItinerary(value: unknown): value is UserItineraryRecord {
  return object(value) && nonempty(value.id) && value.userId === guestId && value.tripId === travelConfig.tripId &&
    value.source === "spontaneous" && value.sourceItineraryId === null &&
    (value.status === "planned" || value.status === "cancelled") && date(value.date) &&
    (value.time === null || (text(value.time) && /^\d{2}:\d{2}(:\d{2})?$/.test(value.time))) &&
    nonempty(value.city) && nonempty(value.title) && optionalText(value.location) &&
    (value.category === null || itineraryCategories.includes(value.category as typeof itineraryCategories[number])) &&
    optionalText(value.note) && timestamp(value.createdAt) && timestamp(value.updatedAt);
}

function checkedArray<T>(value: unknown, valid: (entry: unknown) => entry is T, name: string): T[] {
  if (!Array.isArray(value) || value.length > 10000 || !value.every(valid)) {
    throw new Error(`${name} 数据格式无效。`);
  }
  return value;
}

function checkedActivities(value: unknown): Record<string, ActivityCompletionState> {
  if (!object(value) || Object.keys(value).length > 10000) throw new Error("完成状态数据格式无效。");
  const entries = Object.entries(value);
  if (!entries.every(([key, state]) => activity(state) && state.activity_id === key)) {
    throw new Error("完成状态数据格式无效。");
  }
  return Object.fromEntries(entries) as Record<string, ActivityCompletionState>;
}

function readStored(key: string, fallback: unknown): unknown {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("本地数据已损坏，请先检查浏览器存储。未生成不完整备份。");
  }
}

function currentGuestRecords(): { all: UserItineraryRecord[]; current: UserItineraryRecord[] } {
  const all = checkedArray(readStored(localGuestItineraryCacheKey, []), (value): value is UserItineraryRecord => object(value) && nonempty(value.id) && nonempty(value.userId) && nonempty(value.tripId), "本地行程");
  return { all, current: all.filter((item) => item.userId === guestId && item.tripId === travelConfig.tripId).map((item) => {
    if (!guestItinerary(item)) throw new Error("本地行程数据格式无效。");
    return item;
  }) };
}

export function createLocalBackup(): LocalBackup {
  if (typeof window === "undefined") throw new Error("只能在浏览器中导出数据。");
  const { expenseKey, journalKey, activityKey } = localTravelStorageKeys;
  return {
    format,
    version: 1,
    tripId: travelConfig.tripId,
    exportedAt: new Date().toISOString(),
    expenses: checkedArray(readStored(expenseKey, []), expense, "费用"),
    journals: checkedArray(readStored(journalKey, []), journal, "日记"),
    activityStatus: checkedActivities(readStored(activityKey, {})),
    guestItinerary: currentGuestRecords().current,
  };
}

export function restoreLocalBackup(input: unknown): { expenses: number; journals: number; itinerary: number } {
  if (typeof window === "undefined") throw new Error("只能在浏览器中导入数据。");
  if (!object(input) || input.format !== format || input.version !== 1 || input.tripId !== travelConfig.tripId) {
    throw new Error("备份格式不受支持，或不属于当前旅程。");
  }
  const expenses = checkedArray(input.expenses, expense, "费用");
  const journals = checkedArray(input.journals, journal, "日记");
  const activityStatus = checkedActivities(input.activityStatus);
  const itinerary = checkedArray(input.guestItinerary, guestItinerary, "本地行程");
  const { all } = currentGuestRecords();
  const retained = all.filter((item) => item.userId !== guestId || item.tripId !== travelConfig.tripId);
  const { expenseKey, journalKey, activityKey } = localTravelStorageKeys;
  const writes: [string, string][] = [
    [expenseKey, JSON.stringify(expenses)],
    [journalKey, JSON.stringify(journals)],
    [activityKey, JSON.stringify(activityStatus)],
    [localGuestItineraryCacheKey, JSON.stringify([...retained, ...itinerary])],
  ];
  const previous = writes.map(([key]) => [key, window.localStorage.getItem(key)] as const);
  try {
    for (const [key, value] of writes) window.localStorage.setItem(key, value);
  } catch {
    let rollbackFailed = false;
    for (const [key, value] of previous) {
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch {
        rollbackFailed = true;
      }
    }
    throw new Error(rollbackFailed ? "导入失败且无法完全回滚，请勿继续保存；请保留备份文件。" : "浏览器保存失败，已恢复导入前的数据。");
  }
  return { expenses: expenses.length, journals: journals.length, itinerary: itinerary.length };
}
