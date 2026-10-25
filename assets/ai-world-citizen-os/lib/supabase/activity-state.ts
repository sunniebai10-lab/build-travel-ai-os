import travelConfig from "@/travel.config.json";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";
import type { ActivityCompletionState } from "@/lib/user-input-store";

export interface ActivityStateView extends ActivityCompletionState {
  source: "supabase" | "local";
  legacy?: boolean;
}

export interface ActivityCompletionSaveResult {
  data: ActivityStateView;
  queued: boolean;
  error?: string;
}

export interface ActivityStateQueueSyncResult {
  synced: number;
  remaining: number;
  error?: string;
}

interface LocalActivityState extends ActivityCompletionState {
  updatedAt: string;
  pending: boolean;
}

interface ActivityStateQueueItem {
  id: string;
  userId: string;
  activityId: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const localStateKeyPrefix = "aiwc_activity_state_local_v1";
const queueKey = "aiwc_activity_state_queue_v1";
const canonicalUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let syncInFlight: Promise<ActivityStateQueueSyncResult> | null = null;

function now() {
  return new Date().toISOString();
}

function localStateKey(userId: string) {
  return `${localStateKeyPrefix}:${userId}`;
}

function isCanonicalActivityId(activityId: string) {
  return canonicalUuidPattern.test(activityId);
}

function defaultState(activityId: string): ActivityCompletionState {
  return { activity_id: activityId, completed: false, completed_at: null, journal_created: false };
}

function errorMessage(error: unknown, fallback = "Activity state request failed.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function errorStatus(error: unknown) {
  return typeof error === "object" && error && "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
}

function isRetryableError(error: unknown) {
  const status = errorStatus(error);
  if (status === 0 || (status && status >= 500)) return true;
  return /failed to fetch|load failed|network|networkerror|timeout|timed out|offline|connection|fetch failed/i.test(errorMessage(error, ""));
}

function readLocalStates(userId: string): Record<string, LocalActivityState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(localStateKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, LocalActivityState>) : {};
  } catch {
    return {};
  }
}

function writeLocalStates(userId: string, states: Record<string, LocalActivityState>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localStateKey(userId), JSON.stringify(states));
}

function readLocalState(userId: string, activityId: string) {
  return readLocalStates(userId)[activityId] ?? null;
}

function writeLocalState(userId: string, activityId: string, completed: boolean, pending: boolean, journalCreated = false) {
  const states = readLocalStates(userId);
  const state: LocalActivityState = {
    activity_id: activityId,
    completed,
    completed_at: completed ? now() : null,
    journal_created: journalCreated,
    updatedAt: now(),
    pending,
  };
  writeLocalStates(userId, { ...states, [activityId]: state });
  return state;
}

function removeLocalState(userId: string, activityId: string) {
  const states = readLocalStates(userId);
  if (!(activityId in states)) return;
  delete states[activityId];
  writeLocalStates(userId, states);
}

function toLocalView(state: LocalActivityState): ActivityStateView {
  return {
    activity_id: state.activity_id,
    completed: state.completed,
    completed_at: state.completed_at,
    journal_created: state.journal_created,
    source: "local",
  };
}

function readQueue(): ActivityStateQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(queueKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ActivityStateQueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: ActivityStateQueueItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(queueKey, JSON.stringify(items));
}

function createQueueId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `activity-state-${Date.now()}`;
}

function enqueueLatest(userId: string, activityId: string, completed: boolean) {
  const timestamp = now();
  const queue = readQueue();
  const existing = queue.find((item) => item.userId === userId && item.activityId === activityId);
  const item: ActivityStateQueueItem = existing
    ? { ...existing, completed, updatedAt: timestamp }
    : { id: createQueueId(), userId, activityId, completed, createdAt: timestamp, updatedAt: timestamp };
  writeQueue(existing ? queue.map((candidate) => (candidate.id === existing.id ? item : candidate)) : [...queue, item]);
  return item;
}

async function getAuthenticatedUser() {
  if (!supabase) return { user: null, error: "Supabase is not configured." };
  try {
    const { data, error } = await supabase.auth.getUser();
    if (data.user) return { user: data.user, error: undefined };
    if (!isRetryableError(error)) return { user: null, error: error?.message ?? "User is not signed in." };
    const { data: sessionData } = await supabase.auth.getSession();
    return { user: sessionData.session?.user ?? null, error: error?.message };
  } catch (error) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      return { user: sessionData.session?.user ?? null, error: errorMessage(error) };
    } catch {
      return { user: null, error: errorMessage(error) };
    }
  }
}

async function getCurrentTripId() {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("trips")
      .select("id")
      .eq("id", travelConfig.tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

async function writeCloudActivityState(userId: string, activityId: string, completed: boolean) {
  if (!supabase) return { data: null, error: { message: "Supabase is not configured." } };
  const tripId = await getCurrentTripId();
  return supabase
    .from("activity_state")
    .upsert(
      {
        user_id: userId,
        trip_id: tripId,
        activity_id: activityId,
        completed,
        completed_at: completed ? now() : null,
        updated_at: now(),
      },
      { onConflict: "user_id,activity_id" },
    )
    .select("activity_id,completed,completed_at,journal_created")
    .single();
}

function toSupabaseView(data: ActivityCompletionState): ActivityStateView {
  return { ...data, source: "supabase" };
}

export async function getActivityCompletion(activityId: string, legacyActivityId?: string): Promise<QueryResult<ActivityStateView>> {
  if (!supabase) return fallbackResult({ ...defaultState(activityId), source: "local" }, "Supabase is not configured.");
  const client = supabase;

  const auth = await getAuthenticatedUser();
  if (!auth.user) return fallbackResult({ ...defaultState(activityId), source: "local" }, auth.error ?? "User is not signed in.");
  const user = auth.user;

  const localState = isCanonicalActivityId(activityId) ? readLocalState(user.id, activityId) : null;
  if (localState?.pending) return fallbackResult(toLocalView(localState));

  const readState = (id: string) => client
    .from("activity_state")
    .select("activity_id,completed,completed_at,journal_created")
    .eq("user_id", user.id)
    .eq("activity_id", id)
    .maybeSingle();

  const { data, error } = await readState(activityId);
  if (data) {
    if (isCanonicalActivityId(activityId)) writeLocalState(user.id, activityId, data.completed, false, data.journal_created);
    return supabaseResult(toSupabaseView(data));
  }
  if (error) return fallbackResult(localState ? toLocalView(localState) : { ...defaultState(activityId), source: "local" }, error.message);

  if (legacyActivityId) {
    const { data: legacyData, error: legacyError } = await readState(legacyActivityId);
    if (legacyData) return supabaseResult({ ...toSupabaseView(legacyData), legacy: true });
    if (legacyError) return fallbackResult(localState ? toLocalView(localState) : { ...defaultState(activityId), source: "local" }, legacyError.message);
  }

  return fallbackResult(localState ? toLocalView(localState) : { ...defaultState(activityId), source: "local" }, "Activity state was not found.");
}

export async function saveActivityCompletion(activityId: string, completed: boolean): Promise<ActivityCompletionSaveResult> {
  if (!isCanonicalActivityId(activityId)) {
    return { data: { ...defaultState(activityId), source: "local" }, queued: false, error: "Only canonical itinerary activities can be saved." };
  }

  const auth = await getAuthenticatedUser();
  if (!auth.user) {
    return { data: { ...defaultState(activityId), source: "local" }, queued: false, error: auth.error ?? "User is not signed in." };
  }
  const user = auth.user;

  const previousLocalState = readLocalState(user.id, activityId);
  const optimisticState = writeLocalState(user.id, activityId, completed, true, previousLocalState?.journal_created ?? false);

  try {
    const { data, error } = await writeCloudActivityState(user.id, activityId, completed);
    if (data && !error) {
      writeLocalState(user.id, activityId, data.completed, false, data.journal_created);
      writeQueue(readQueue().filter((item) => !(item.userId === user.id && item.activityId === activityId)));
      return { data: toSupabaseView(data), queued: false };
    }
    if (isRetryableError(error)) {
      enqueueLatest(user.id, activityId, completed);
      return { data: toLocalView(optimisticState), queued: true, error: errorMessage(error) };
    }
    if (previousLocalState) writeLocalStates(user.id, { ...readLocalStates(user.id), [activityId]: previousLocalState });
    else removeLocalState(user.id, activityId);
    return {
      data: previousLocalState ? toLocalView(previousLocalState) : { ...defaultState(activityId), source: "local" },
      queued: false,
      error: errorMessage(error),
    };
  } catch (error) {
    if (isRetryableError(error)) {
      enqueueLatest(user.id, activityId, completed);
      return { data: toLocalView(optimisticState), queued: true, error: errorMessage(error) };
    }
    if (previousLocalState) writeLocalStates(user.id, { ...readLocalStates(user.id), [activityId]: previousLocalState });
    else removeLocalState(user.id, activityId);
    return {
      data: previousLocalState ? toLocalView(previousLocalState) : { ...defaultState(activityId), source: "local" },
      queued: false,
      error: errorMessage(error),
    };
  }
}

async function syncQueue(): Promise<ActivityStateQueueSyncResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.user) return { synced: 0, remaining: 0, error: auth.error ?? "User is not signed in." };
  const user = auth.user;

  const queue = readQueue();
  const ownItems = queue
    .filter((item) => item.userId === user.id && isCanonicalActivityId(item.activityId))
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
  const retained = queue.filter((item) => item.userId !== user.id || !isCanonicalActivityId(item.activityId));
  let synced = 0;
  let failure: string | undefined;

  for (let index = 0; index < ownItems.length; index += 1) {
    const item = ownItems[index];
    try {
      const { data, error } = await writeCloudActivityState(user.id, item.activityId, item.completed);
      if (data && !error) {
        writeLocalState(user.id, item.activityId, data.completed, false, data.journal_created);
        synced += 1;
        continue;
      }
      if (isRetryableError(error)) {
        retained.push(...ownItems.slice(index));
        failure = errorMessage(error);
        break;
      }
      removeLocalState(user.id, item.activityId);
      failure = errorMessage(error);
    } catch (error) {
      if (isRetryableError(error)) {
        retained.push(...ownItems.slice(index));
        failure = errorMessage(error);
        break;
      }
      removeLocalState(user.id, item.activityId);
      failure = errorMessage(error);
    }
  }

  writeQueue(retained);
  return { synced, remaining: retained.filter((item) => item.userId === user.id).length, error: failure };
}

export function syncActivityStateQueue() {
  if (!syncInFlight) {
    syncInFlight = syncQueue().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}
