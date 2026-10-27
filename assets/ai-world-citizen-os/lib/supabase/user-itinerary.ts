import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";

export const itineraryCategories = ["History", "Culture", "Food", "Nature", "Experience", "Transport", "Planning"] as const;

export type ItineraryCategory = (typeof itineraryCategories)[number];
export type UserItinerarySource = "spontaneous" | "override";
export type UserItineraryStatus = "planned" | "cancelled";

export interface UserItineraryRecord {
  id: string;
  userId: string;
  tripId: string;
  sourceItineraryId: string | null;
  date: string;
  time: string | null;
  city: string;
  title: string;
  location: string | null;
  category: ItineraryCategory | null;
  note: string | null;
  source: UserItinerarySource;
  status: UserItineraryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SpontaneousItineraryInput {
  id?: string;
  tripId: string;
  date: string;
  time?: string | null;
  city: string;
  title: string;
  location?: string | null;
  category?: ItineraryCategory | null;
  note?: string | null;
}

export interface PlannedItineraryOverrideInput {
  id?: string;
  tripId: string;
  date: string;
  time?: string | null;
  city: string;
  title: string;
  location?: string | null;
  category?: ItineraryCategory | null;
  note?: string | null;
  status?: UserItineraryStatus;
}

export interface UserItineraryUpdateInput {
  date?: string;
  time?: string | null;
  city?: string;
  title?: string;
  location?: string | null;
  category?: ItineraryCategory | null;
  note?: string | null;
}

export interface UserItineraryWriteResult {
  data: UserItineraryRecord | null;
  source: "supabase" | "local" | "none";
  queued: boolean;
  error?: string;
}

export type UserItineraryQueueOperation = "create" | "update" | "cancel" | "restore";

export interface UserItineraryQueueItem {
  id: string;
  userId: string;
  tripId: string;
  operation: UserItineraryQueueOperation;
  entityId?: string;
  sourceItineraryId?: string;
  payload?: Partial<UserItineraryRecord>;
  createdAt: string;
}

export interface UserItineraryQueueSyncResult {
  synced: number;
  remaining: number;
  error?: string;
}

const queueKey = "aiwc_user_itinerary_queue_v1";
const personalCacheKey = "aiwc_user_itinerary_local_v1";
export const localGuestItineraryCacheKey = personalCacheKey;
const baselineCacheKey = "aiwc_public_itinerary_baseline_v1";
const localGuestId = "local-guest";

export interface PublicItinerarySnapshot {
  id: string;
  tripId: string;
  date: string;
  time: string | null;
  city: string;
  title: string;
  location: string | null;
  category: ItineraryCategory | null;
  aiNote: string | null;
  createdAt: string;
}

type UserItineraryRow = {
  id: string;
  user_id: string;
  trip_id: string;
  source_itinerary_id: string | null;
  date: string;
  time: string | null;
  city: string;
  title: string;
  location: string | null;
  category: ItineraryCategory | null;
  note: string | null;
  source: UserItinerarySource;
  status: UserItineraryStatus;
  created_at: string;
  updated_at: string;
};

type UserItineraryUpdateRow = Pick<UserItineraryRow, "updated_at"> &
  Partial<Pick<UserItineraryRow, "date" | "time" | "city" | "title" | "location" | "category" | "note" | "status">>;

function readQueue() {
  if (typeof window === "undefined") return [] as UserItineraryQueueItem[];

  try {
    const raw = window.localStorage.getItem(queueKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as UserItineraryQueueItem[]) : [];
  } catch {
    return [] as UserItineraryQueueItem[];
  }
}

function writeQueue(items: UserItineraryQueueItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(queueKey, JSON.stringify(items));
}

function readLocalRecords() {
  if (typeof window === "undefined") return [] as UserItineraryRecord[];

  try {
    const raw = window.localStorage.getItem(personalCacheKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as UserItineraryRecord[]) : [];
  } catch {
    return [] as UserItineraryRecord[];
  }
}

function writeLocalRecords(records: UserItineraryRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(personalCacheKey, JSON.stringify(records));
}

function readBaselineCache() {
  if (typeof window === "undefined") return [] as PublicItinerarySnapshot[];

  try {
    const raw = window.localStorage.getItem(baselineCacheKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as PublicItinerarySnapshot[]) : [];
  } catch {
    return [] as PublicItinerarySnapshot[];
  }
}

function writeBaselineCache(records: PublicItinerarySnapshot[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(baselineCacheKey, JSON.stringify(records));
}

function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function now() {
  return new Date().toISOString();
}

function toRecord(row: UserItineraryRow): UserItineraryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id,
    sourceItineraryId: row.source_itinerary_id,
    date: row.date,
    time: row.time,
    city: row.city,
    title: row.title,
    location: row.location,
    category: row.category,
    note: row.note,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cacheUserItineraryRecords(userId: string, tripId: string, records: UserItineraryRecord[]) {
  const retained = readLocalRecords().filter((record) => record.userId !== userId || record.tripId !== tripId);
  writeLocalRecords([...retained, ...records]);
}

function getCachedUserItinerary(userId: string, tripId?: string) {
  return readLocalRecords().filter((record) => record.userId === userId && (!tripId || record.tripId === tripId));
}

function upsertCachedUserItinerary(record: UserItineraryRecord) {
  const records = readLocalRecords();
  const index = records.findIndex((item) => item.id === record.id && item.userId === record.userId);
  if (index >= 0) records[index] = record;
  else records.push(record);
  writeLocalRecords(records);
}

export function cachePublicItineraryBaseline(tripId: string, records: PublicItinerarySnapshot[]) {
  const existing = readBaselineCache();
  const retained = existing.filter((record) => record.tripId !== tripId || !records.some((next) => next.id === record.id));
  writeBaselineCache([...retained, ...records]);
}

export function getCachedPublicItineraryBaseline(tripId: string, date?: string) {
  return readBaselineCache().filter((record) => record.tripId === tripId && (!date || record.date === date));
}

export function findCachedPublicItineraryById(activityId: string) {
  return readBaselineCache().find((record) => record.id === activityId) ?? null;
}

export async function findCurrentUserCachedItineraryById(activityId: string) {
  if (!supabase) return getCachedUserItinerary(localGuestId).find((record) => record.id === activityId) ?? null;
  const auth = await getAuthenticatedUser();
  if (!auth.user) return null;

  return getCachedUserItinerary(auth.user.id).find((record) => record.id === activityId) ?? null;
}

function toPublicSnapshot(row: {
  id: string;
  trip_id: string | null;
  date: string;
  time: string | null;
  city: string;
  title: string;
  location: string | null;
  category: ItineraryCategory | null;
  ai_note?: string | null;
  created_at?: string;
}): PublicItinerarySnapshot | null {
  if (!row.trip_id) return null;
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.date,
    time: row.time,
    city: row.city,
    title: row.title,
    location: row.location,
    category: row.category,
    aiNote: row.ai_note ?? null,
    createdAt: row.created_at ?? now(),
  };
}

function cancelledOverrideInput(base: PublicItinerarySnapshot): PlannedItineraryOverrideInput {
  return {
    tripId: base.tripId,
    date: base.date,
    time: base.time,
    city: base.city,
    title: base.title,
    location: base.location,
    category: base.category,
    status: "cancelled",
  };
}

function toRow(record: UserItineraryRecord): UserItineraryRow {
  return {
    id: record.id,
    user_id: record.userId,
    trip_id: record.tripId,
    source_itinerary_id: record.sourceItineraryId,
    date: record.date,
    time: record.time,
    city: record.city,
    title: record.title,
    location: record.location,
    category: record.category,
    note: record.note,
    source: record.source,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function validateCategory(category: ItineraryCategory | null | undefined) {
  if (category == null || itineraryCategories.includes(category)) return;
  throw new Error("Invalid itinerary category.");
}

function validateRequired(input: Pick<SpontaneousItineraryInput, "tripId" | "date" | "city" | "title">) {
  if (!input.tripId.trim() || !input.date.trim() || !input.city.trim() || !input.title.trim()) {
    throw new Error("Trip, date, city, and title are required.");
  }
}

function enqueue(item: Omit<UserItineraryQueueItem, "id" | "createdAt">) {
  const next: UserItineraryQueueItem = {
    ...item,
    id: createUuid(),
    createdAt: now(),
  };
  writeQueue([...readQueue(), next]);
  return next;
}

async function getAuthenticatedUser() {
  if (!supabase) return { user: null, error: "Supabase is not configured." };

  try {
    const { data, error } = await supabase.auth.getUser();
    if (data.user) return { user: data.user, error: undefined };

    if (!isRetryableError(error)) return { user: null, error: error?.message };

    const { data: sessionData } = await supabase.auth.getSession();
    return { user: sessionData.session?.user ?? null, error: error?.message };
  } catch (error) {
    const { data: sessionData } = await supabase.auth.getSession();
    return {
      user: sessionData.session?.user ?? null,
      error: errorMessage(error),
    };
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return "Itinerary request failed.";
}

function responseStatus(response: unknown) {
  return typeof response === "object" && response && "status" in response && typeof response.status === "number"
    ? response.status
    : undefined;
}

function isRetryableError(error: unknown, responseStatus?: number) {
  if (!error) return false;

  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
  if (responseStatus === 0 || status === 0) return true;
  if ((responseStatus && responseStatus >= 500) || (status && status >= 500)) return true;

  const message = errorMessage(error).toLowerCase();
  return /failed to fetch|load failed|network|networkerror|timeout|timed out|offline|connection|fetch failed/.test(message);
}

function writeFailure(error: unknown, message: string, responseStatus?: number) {
  return {
    message: errorMessage(error) || message,
    retryable: isRetryableError(error, responseStatus),
  };
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function buildSpontaneousRecord(userId: string, input: SpontaneousItineraryInput): UserItineraryRecord {
  validateRequired(input);
  validateCategory(input.category);
  const timestamp = now();

  return {
    id: input.id ?? createUuid(),
    userId,
    tripId: input.tripId,
    sourceItineraryId: null,
    date: input.date,
    time: input.time ?? null,
    city: input.city.trim(),
    title: input.title.trim(),
    location: input.location?.trim() || null,
    category: input.category ?? null,
    note: input.note?.trim() || null,
    source: "spontaneous",
    status: "planned",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildOverrideRecord(userId: string, sourceItineraryId: string, input: PlannedItineraryOverrideInput, existing?: UserItineraryRecord): UserItineraryRecord {
  validateRequired(input);
  validateCategory(input.category);
  const timestamp = now();

  return {
    id: existing?.id ?? input.id ?? createUuid(),
    userId,
    tripId: input.tripId,
    sourceItineraryId,
    date: input.date,
    time: input.time ?? null,
    city: input.city.trim(),
    title: input.title.trim(),
    location: input.location?.trim() || null,
    category: input.category ?? null,
    note: input.note?.trim() || null,
    source: "override",
    status: input.status ?? "planned",
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

async function insertRecord(record: UserItineraryRecord) {
  if (!supabase) return { data: null, error: { message: "Supabase is not configured." } };
  return supabase.from("user_itinerary").insert(toRow(record)).select().single();
}

async function updateRecord(id: string, userId: string, patch: Partial<UserItineraryRecord>) {
  if (!supabase) return { data: null, error: { message: "Supabase is not configured." } };

  const payload: UserItineraryUpdateRow = {
    updated_at: now(),
  };

  if (patch.date !== undefined) payload.date = patch.date;
  if (patch.time !== undefined) payload.time = patch.time;
  if (patch.city !== undefined) payload.city = patch.city;
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.location !== undefined) payload.location = patch.location;
  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.note !== undefined) payload.note = patch.note;
  if (patch.status !== undefined) payload.status = patch.status;

  return supabase.from("user_itinerary").update(payload).eq("id", id).eq("user_id", userId).select().single();
}

async function findOverride(userId: string, sourceItineraryId: string) {
  if (!supabase) return { data: null, error: { message: "Supabase is not configured." } };

  return supabase
    .from("user_itinerary")
    .select("id,user_id,trip_id,source_itinerary_id,date,time,city,title,location,category,note,source,status,created_at,updated_at")
    .eq("user_id", userId)
    .eq("source_itinerary_id", sourceItineraryId)
    .maybeSingle();
}

async function findPlannedItinerary(sourceItineraryId: string) {
  if (!supabase) return { data: null, error: { message: "Supabase is not configured." } };

  return supabase
    .from("itinerary")
    .select("id,trip_id,date,time,city,title,location,category")
    .eq("id", sourceItineraryId)
    .single();
}

function applyQueueOperations(records: UserItineraryRecord[], queue: UserItineraryQueueItem[]) {
  const next = records.map((record) => ({ ...record }));

  for (const item of [...queue].sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const payload = item.payload;
    const sourceItineraryId = item.sourceItineraryId ?? payload?.sourceItineraryId;
    const targetIndex = item.entityId
      ? next.findIndex((record) => record.id === item.entityId)
      : sourceItineraryId
        ? next.findIndex((record) => record.sourceItineraryId === sourceItineraryId)
        : -1;

    if (item.operation === "restore" && sourceItineraryId) {
      if (targetIndex >= 0) next.splice(targetIndex, 1);
      continue;
    }

    if (item.operation === "restore" && targetIndex >= 0) {
      next[targetIndex] = { ...next[targetIndex], status: "planned", updatedAt: item.createdAt };
      continue;
    }

    if (item.operation === "create" && payload?.id && targetIndex < 0) {
      next.push(payload as UserItineraryRecord);
      continue;
    }

    if (item.operation === "update" && payload) {
      if (targetIndex >= 0) {
        next[targetIndex] = { ...next[targetIndex], ...payload, updatedAt: item.createdAt };
      } else if (payload.id && payload.source === "override") {
        next.push(payload as UserItineraryRecord);
      }
      continue;
    }

    if (item.operation === "cancel") {
      if (targetIndex >= 0) {
        next[targetIndex] = { ...next[targetIndex], status: "cancelled", updatedAt: item.createdAt };
      } else if (payload?.id && payload.source === "override") {
        next.push({ ...payload, status: "cancelled" } as UserItineraryRecord);
      }
    }
  }

  return next;
}

export function getPendingUserItineraryQueue(userId: string, tripId?: string) {
  return readQueue().filter((item) => item.userId === userId && (!tripId || item.tripId === tripId));
}

export function applyPendingUserItineraryQueue(records: UserItineraryRecord[], userId: string, tripId: string) {
  return applyQueueOperations(records, getPendingUserItineraryQueue(userId, tripId));
}

export async function getUserItinerary(tripId: string, date?: string): Promise<QueryResult<UserItineraryRecord[]>> {
  if (!supabase) {
    const records = getCachedUserItinerary(localGuestId, tripId);
    return fallbackResult(date ? records.filter((record) => record.date === date) : records, "Stored on this device only.");
  }
  const auth = await getAuthenticatedUser();
  if (!auth.user) {
    return fallbackResult([], auth.error ?? "User is not signed in.");
  }

  await syncUserItineraryQueue(auth.user.id, tripId);

  if (!supabase) {
    return fallbackResult([], "Supabase is not configured.");
  }

  let query = supabase
    .from("user_itinerary")
    .select("id,user_id,trip_id,source_itinerary_id,date,time,city,title,location,category,note,source,status,created_at,updated_at")
    .eq("user_id", auth.user.id)
    .eq("trip_id", tripId)
    .order("date")
    .order("time", { nullsFirst: false })
    .order("created_at");

  if (date) query = query.eq("date", date);

  const { data, error } = await query;
  const remoteRecords = (data ?? []).map(toRecord);
  if (!error) cacheUserItineraryRecords(auth.user.id, tripId, remoteRecords);

  const baseRecords = error ? getCachedUserItinerary(auth.user.id, tripId) : remoteRecords;
  const pending = applyPendingUserItineraryQueue(baseRecords, auth.user.id, tripId);
  cacheUserItineraryRecords(auth.user.id, tripId, pending);

  if (error) {
    return fallbackResult(pending, error.message);
  }

  return supabaseResult(pending);
}

export async function createSpontaneousItinerary(input: SpontaneousItineraryInput): Promise<UserItineraryWriteResult> {
  if (!supabase) {
    try {
      const record = buildSpontaneousRecord(localGuestId, input);
      upsertCachedUserItinerary(record);
      return { data: record, source: "local", queued: false };
    } catch (error) {
      return { data: null, source: "none", queued: false, error: errorMessage(error) };
    }
  }
  const auth = await getAuthenticatedUser();
  if (!auth.user) return { data: null, source: "none", queued: false, error: auth.error ?? "User is not signed in." };

  let record: UserItineraryRecord;
  try {
    record = buildSpontaneousRecord(auth.user.id, input);
  } catch (error) {
    return { data: null, source: "none", queued: false, error: errorMessage(error) };
  }

  try {
    const result = await insertRecord(record);
    const { data, error } = result;
    if (error || !data) {
      const failure = writeFailure(error, "Itinerary could not be saved.", responseStatus(result));
      if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

      enqueue({ userId: auth.user.id, tripId: record.tripId, operation: "create", entityId: record.id, payload: record });
      upsertCachedUserItinerary(record);
      return { data: record, source: "local", queued: true, error: failure.message };
    }

    const saved = toRecord(data);
    upsertCachedUserItinerary(saved);
    return { data: saved, source: "supabase", queued: false };
  } catch (error) {
    const failure = writeFailure(error, "Itinerary could not be created.");
    if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

    enqueue({ userId: auth.user.id, tripId: record.tripId, operation: "create", entityId: record.id, payload: record });
    upsertCachedUserItinerary(record);
    return { data: record, source: "local", queued: true, error: failure.message };
  }
}

export async function overridePlannedItinerary(sourceItineraryId: string, input: PlannedItineraryOverrideInput): Promise<UserItineraryWriteResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.user) return { data: null, source: "none", queued: false, error: auth.error ?? "User is not signed in." };

  try {
    const existingResult = await findOverride(auth.user.id, sourceItineraryId);
    const cached = getCachedUserItinerary(auth.user.id, input.tripId).find((item) => item.sourceItineraryId === sourceItineraryId);
    const existing = existingResult.data ? toRecord(existingResult.data) : cached;
    const record = buildOverrideRecord(auth.user.id, sourceItineraryId, input, existing);
    const writeResult = existing
      ? await updateRecord(existing.id, auth.user.id, record)
      : await insertRecord(record);

    if (writeResult.error || !writeResult.data) {
      const failure = writeFailure(writeResult.error, "Itinerary override could not be saved.", responseStatus(writeResult));
      if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

      enqueue({ userId: auth.user.id, tripId: record.tripId, operation: "update", entityId: record.id, sourceItineraryId, payload: record });
      upsertCachedUserItinerary(record);
      return {
        data: record,
        source: "local",
        queued: true,
        error: failure.message,
      };
    }

    const saved = toRecord(writeResult.data);
    upsertCachedUserItinerary(saved);
    return { data: saved, source: "supabase", queued: false };
  } catch (error) {
    const failure = writeFailure(error, "Itinerary override could not be saved.");
    if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

    try {
      const existing = getCachedUserItinerary(auth.user.id, input.tripId).find((item) => item.sourceItineraryId === sourceItineraryId);
      const record = buildOverrideRecord(auth.user.id, sourceItineraryId, input, existing);
      enqueue({ userId: auth.user.id, tripId: record.tripId, operation: "update", entityId: record.id, sourceItineraryId, payload: record });
      upsertCachedUserItinerary(record);
      return { data: record, source: "local", queued: true, error: failure.message };
    } catch (validationError) {
      return { data: null, source: "none", queued: false, error: errorMessage(validationError) };
    }
  }
}

async function createCancelledOverride(userId: string, tripId: string, sourceItineraryId: string) {
  try {
    const baseResult = await findPlannedItinerary(sourceItineraryId);
    const base = baseResult.data ? toPublicSnapshot(baseResult.data) : getCachedPublicItineraryBaseline(tripId).find((item) => item.id === sourceItineraryId);

    if (!base || base.tripId !== tripId) {
      const failure = writeFailure(baseResult.error, "Planned itinerary was not found.", responseStatus(baseResult));
      return { data: null, source: "none" as const, queued: false, error: failure.message };
    }

    return overridePlannedItinerary(sourceItineraryId, cancelledOverrideInput(base));
  } catch (error) {
    const failure = writeFailure(error, "Planned itinerary could not be cancelled.");
    const base = getCachedPublicItineraryBaseline(tripId).find((item) => item.id === sourceItineraryId);
    if (!failure.retryable || !base) return { data: null, source: "none" as const, queued: false, error: failure.message };

    return overridePlannedItinerary(sourceItineraryId, cancelledOverrideInput(base));
  }
}

export async function cancelUserItinerary(id: string, tripId: string): Promise<UserItineraryWriteResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.user) return { data: null, source: "none", queued: false, error: auth.error ?? "User is not signed in." };

  try {
    const result = await updateRecord(id, auth.user.id, { status: "cancelled" });
    const { data, error } = result;
    if (error || !data) {
      const failure = writeFailure(error, "Itinerary could not be cancelled.", responseStatus(result));
      if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

      const cached = getCachedUserItinerary(auth.user.id, tripId).find((item) => item.id === id);
      if (!cached) return { data: null, source: "none", queued: false, error: failure.message };

      const local = { ...cached, status: "cancelled" as const, updatedAt: now() };
      enqueue({ userId: auth.user.id, tripId, operation: "cancel", entityId: id, payload: local });
      upsertCachedUserItinerary(local);
      return { data: local, source: "local", queued: true, error: failure.message };
    }

    const saved = toRecord(data);
    upsertCachedUserItinerary(saved);
    return { data: saved, source: "supabase", queued: false };
  } catch (error) {
    const failure = writeFailure(error, "Itinerary could not be cancelled.");
    if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

    const cached = getCachedUserItinerary(auth.user.id, tripId).find((item) => item.id === id);
    if (!cached) return { data: null, source: "none", queued: false, error: failure.message };

    const local = { ...cached, status: "cancelled" as const, updatedAt: now() };
    enqueue({ userId: auth.user.id, tripId, operation: "cancel", entityId: id, payload: local });
    upsertCachedUserItinerary(local);
    return { data: local, source: "local", queued: true, error: failure.message };
  }
}

export async function restoreUserItinerary(id: string, tripId: string): Promise<UserItineraryWriteResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.user) return { data: null, source: "none", queued: false, error: auth.error ?? "User is not signed in." };

  try {
    const result = await updateRecord(id, auth.user.id, { status: "planned" });
    const { data, error } = result;
    if (error || !data) {
      const failure = writeFailure(error, "Itinerary could not be restored.", responseStatus(result));
      if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

      const cached = getCachedUserItinerary(auth.user.id, tripId).find((item) => item.id === id);
      if (!cached) return { data: null, source: "none", queued: false, error: failure.message };

      const local = { ...cached, status: "planned" as const, updatedAt: now() };
      enqueue({ userId: auth.user.id, tripId, operation: "restore", entityId: id, payload: local });
      upsertCachedUserItinerary(local);
      return { data: local, source: "local", queued: true, error: failure.message };
    }

    const saved = toRecord(data);
    upsertCachedUserItinerary(saved);
    return { data: saved, source: "supabase", queued: false };
  } catch (error) {
    const failure = writeFailure(error, "Itinerary could not be restored.");
    if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

    const cached = getCachedUserItinerary(auth.user.id, tripId).find((item) => item.id === id);
    if (!cached) return { data: null, source: "none", queued: false, error: failure.message };

    const local = { ...cached, status: "planned" as const, updatedAt: now() };
    enqueue({ userId: auth.user.id, tripId, operation: "restore", entityId: id, payload: local });
    upsertCachedUserItinerary(local);
    return { data: local, source: "local", queued: true, error: failure.message };
  }
}

export async function cancelPlannedItinerary(sourceItineraryId: string, tripId: string): Promise<UserItineraryWriteResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.user) return { data: null, source: "none", queued: false, error: auth.error ?? "User is not signed in." };
  return createCancelledOverride(auth.user.id, tripId, sourceItineraryId);
}

export async function restorePlannedItinerary(sourceItineraryId: string, tripId: string): Promise<UserItineraryWriteResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.user) return { data: null, source: "none", queued: false, error: auth.error ?? "User is not signed in." };
  if (!supabase) return { data: null, source: "none", queued: false, error: "Supabase is not configured." };

  try {
    const lookupResult = await findOverride(auth.user.id, sourceItineraryId);
    const { data: existing, error: lookupError } = lookupResult;
    const cached = getCachedUserItinerary(auth.user.id, tripId).find((item) => item.sourceItineraryId === sourceItineraryId);
    if (lookupError && !isRetryableError(lookupError, responseStatus(lookupResult))) {
      return { data: null, source: "none", queued: false, error: lookupError.message };
    }

    const override = existing ? toRecord(existing) : cached;
    if (!override) return { data: null, source: "supabase", queued: false };

    const deleteResult = await supabase
      .from("user_itinerary")
      .delete()
      .eq("id", override.id)
      .eq("user_id", auth.user.id);
    const { error } = deleteResult;

    if (error) {
      const failure = writeFailure(error, "Itinerary override could not be restored.", responseStatus(deleteResult));
      if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

      enqueue({ userId: auth.user.id, tripId, operation: "restore", entityId: override.id, sourceItineraryId });
      return { data: override, source: "local", queued: true, error: failure.message };
    }

    cacheUserItineraryRecords(
      auth.user.id,
      tripId,
      getCachedUserItinerary(auth.user.id, tripId).filter((item) => item.id !== override.id),
    );
    return { data: null, source: "supabase", queued: false };
  } catch (error) {
    const failure = writeFailure(error, "Itinerary override could not be restored.");
    if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

    const override = getCachedUserItinerary(auth.user.id, tripId).find((item) => item.sourceItineraryId === sourceItineraryId);
    if (!override) return { data: null, source: "none", queued: false, error: failure.message };

    enqueue({ userId: auth.user.id, tripId, operation: "restore", entityId: override.id, sourceItineraryId });
    return { data: override, source: "local", queued: true, error: failure.message };
  }
}

export async function updateUserItinerary(id: string, tripId: string, input: UserItineraryUpdateInput): Promise<UserItineraryWriteResult> {
  if (!supabase) {
    try {
      const existing = getCachedUserItinerary(localGuestId, tripId).find((item) => item.id === id && item.source === "spontaneous");
      if (!existing) return { data: null, source: "none", queued: false, error: "Itinerary was not found." };
      validateCategory(input.category);
      validateRequired({ ...existing, ...input });
      const saved = { ...existing, ...input, updatedAt: now() };
      upsertCachedUserItinerary(saved);
      return { data: saved, source: "local", queued: false };
    } catch (error) {
      return { data: null, source: "none", queued: false, error: errorMessage(error) };
    }
  }
  const auth = await getAuthenticatedUser();
  if (!auth.user) return { data: null, source: "none", queued: false, error: auth.error ?? "User is not signed in." };

  try {
    validateCategory(input.category);
    const patch: Partial<UserItineraryRecord> = {
      ...input,
      updatedAt: now(),
    };
    const result = await updateRecord(id, auth.user.id, patch);
    const { data, error } = result;
    if (error || !data) {
      const failure = writeFailure(error, "Itinerary could not be updated.", responseStatus(result));
      if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

      const cached = getCachedUserItinerary(auth.user.id, tripId).find((item) => item.id === id);
      if (!cached) return { data: null, source: "none", queued: false, error: failure.message };

      const local = { ...cached, ...patch, updatedAt: now() };
      enqueue({ userId: auth.user.id, tripId, operation: "update", entityId: id, payload: local });
      upsertCachedUserItinerary(local);
      return { data: local, source: "local", queued: true, error: failure.message };
    }

    const saved = toRecord(data);
    upsertCachedUserItinerary(saved);
    return { data: saved, source: "supabase", queued: false };
  } catch (error) {
    const failure = writeFailure(error, "Itinerary could not be updated.");
    if (!failure.retryable) return { data: null, source: "none", queued: false, error: failure.message };

    const cached = getCachedUserItinerary(auth.user.id, tripId).find((item) => item.id === id);
    if (!cached) return { data: null, source: "none", queued: false, error: failure.message };

    const local = { ...cached, ...input, updatedAt: now() };
    enqueue({ userId: auth.user.id, tripId, operation: "update", entityId: id, payload: local });
    upsertCachedUserItinerary(local);
    return { data: local, source: "local", queued: true, error: failure.message };
  }
}

export async function removeSpontaneousItinerary(id: string, tripId: string): Promise<UserItineraryWriteResult> {
  if (supabase) return cancelUserItinerary(id, tripId);
  try {
    const records = getCachedUserItinerary(localGuestId, tripId);
    const existing = records.find((item) => item.id === id && item.source === "spontaneous");
    if (!existing) return { data: null, source: "none", queued: false, error: "Itinerary was not found." };
    cacheUserItineraryRecords(localGuestId, tripId, records.filter((item) => item.id !== id));
    return { data: existing, source: "local", queued: false };
  } catch (error) {
    return { data: null, source: "none", queued: false, error: errorMessage(error) };
  }
}

async function replayQueueItem(item: UserItineraryQueueItem, userId: string) {
  if (item.operation === "create" && item.payload?.id) {
    const record = item.payload as UserItineraryRecord;
    const result = await insertRecord(record);
    if (!result.error || !isUniqueViolation(result.error) || !supabase) return result;

    const { data: existing, error: lookupError } = await supabase
      .from("user_itinerary")
      .select("id,user_id,trip_id,source,source_itinerary_id")
      .eq("id", record.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (
      !lookupError &&
      existing?.id === record.id &&
      existing.user_id === userId &&
      existing.trip_id === record.tripId &&
      existing.source === "spontaneous" &&
      existing.source_itinerary_id === null
    ) {
      return { data: existing, error: null };
    }

    return result;
  }

  if (item.operation === "update" && item.payload?.source === "override" && item.sourceItineraryId) {
    const existingResult = await findOverride(userId, item.sourceItineraryId);
    const record = item.payload as UserItineraryRecord;
    return existingResult.data
      ? updateRecord(existingResult.data.id, userId, record)
      : insertRecord(record);
  }

  if (item.operation === "update" && item.entityId) {
    return updateRecord(item.entityId, userId, item.payload ?? {});
  }

  if (item.operation === "cancel" && item.entityId) {
    return updateRecord(item.entityId, userId, { status: "cancelled" });
  }

  if (item.operation === "cancel" && item.sourceItineraryId) {
    const baseResult = await findPlannedItinerary(item.sourceItineraryId);
    if (baseResult.error || !baseResult.data) return { data: null, error: baseResult.error ?? { message: "Planned itinerary was not found." } };
    if (!baseResult.data.trip_id) return { data: null, error: { message: "Planned itinerary is missing its trip." } };

    const existingResult = await findOverride(userId, item.sourceItineraryId);
    const existing = existingResult.data ? toRecord(existingResult.data) : undefined;
    const record = buildOverrideRecord(userId, item.sourceItineraryId, {
      tripId: baseResult.data.trip_id,
      date: baseResult.data.date,
      time: baseResult.data.time,
      city: baseResult.data.city,
      title: baseResult.data.title,
      location: baseResult.data.location,
      category: baseResult.data.category,
      status: "cancelled",
    }, existing);
    return existing ? updateRecord(existing.id, userId, record) : insertRecord(record);
  }

  if (item.operation === "restore" && item.sourceItineraryId) {
    const existingResult = await findOverride(userId, item.sourceItineraryId);
    if (existingResult.error) return { data: null, error: existingResult.error };
    if (!existingResult.data || !supabase) return { data: null, error: null };
    return supabase.from("user_itinerary").delete().eq("id", existingResult.data.id).eq("user_id", userId);
  }

  if (item.operation === "restore" && item.entityId) {
    return updateRecord(item.entityId, userId, { status: "planned" });
  }

  return { data: null, error: { message: "Unsupported itinerary queue operation." } };
}

export async function syncUserItineraryQueue(userId: string, tripId?: string): Promise<UserItineraryQueueSyncResult> {
  if (!supabase) {
    return { synced: 0, remaining: getPendingUserItineraryQueue(userId, tripId).length, error: "Supabase is not configured." };
  }

  const queue = readQueue();
  const ownItems = queue
    .filter((item) => item.userId === userId && (!tripId || item.tripId === tripId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const retained = queue.filter((item) => item.userId !== userId || (tripId && item.tripId !== tripId));
  let synced = 0;
  let failure: string | undefined;

  for (let index = 0; index < ownItems.length; index += 1) {
    const item = ownItems[index];
    const result = await replayQueueItem(item, userId);
    if (result.error) {
      failure = result.error.message;
      retained.push(...ownItems.slice(index));
      break;
    }
    synced += 1;
  }

  writeQueue(retained);
  return { synced, remaining: retained.filter((item) => item.userId === userId && (!tripId || item.tripId === tripId)).length, error: failure };
}
