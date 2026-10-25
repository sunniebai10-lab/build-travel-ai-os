import travelConfig from "@/travel.config.json";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";
import { resolveJournalPhotoUrls } from "@/lib/supabase/storage";
import { addUserJournal, getUserJournals, isValidCalendarDate, updateUserJournalStory, type UserJournalInput } from "@/lib/user-input-store";

export interface JournalEntryView {
  id: string;
  date: string;
  city: string;
  photos: string[];
  photoRefs?: string[];
  sentence: string;
  story: string;
}

export interface PersistenceResult {
  source: "supabase" | "local" | "none";
  error?: string;
}

function normalizePhotos(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function getLocalJournalEntries(): JournalEntryView[] {
  return getUserJournals().map((journal) => ({
    id: journal.id,
    date: journal.date,
    city: journal.city,
    photos: journal.photos,
    photoRefs: journal.photos,
    sentence: journal.sentence,
    story: journal.story,
  }));
}

async function getCurrentTripId() {
  if (!supabase) return null;

  const { data } = await supabase
    .from("trips")
    .select("id")
    .eq("id", travelConfig.tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.id ?? null;
}

export async function getJournalEntries(): Promise<QueryResult<JournalEntryView[]>> {
  if (!supabase) {
    return fallbackResult(getLocalJournalEntries(), "Supabase is not configured.");
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult?.user;

  if (userError || !user) {
    return fallbackResult(getLocalJournalEntries(), userError?.message ?? "User is not signed in.");
  }

  const { data, error } = await supabase
    .from("journal")
    .select("id,date,city,photos,sentence,story")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) {
    return fallbackResult(getLocalJournalEntries(), error?.message ?? "Journal data was not found.");
  }

  const journals = await Promise.all(data.map(async (journal) => ({
      id: journal.id,
      date: journal.date,
      city: journal.city,
      photos: await resolveJournalPhotoUrls(normalizePhotos(journal.photos)),
      photoRefs: normalizePhotos(journal.photos),
      sentence: journal.sentence ?? "",
      story: journal.story ?? "",
    })));

  const cloudIds = new Set(journals.map((journal) => journal.id));
  const merged = [...journals, ...getLocalJournalEntries().filter((journal) => !cloudIds.has(journal.id))].sort((left, right) => right.date.localeCompare(left.date));

  return supabaseResult(merged);
}

function fallbackJournalSave(journal: UserJournalInput, error: string, fallbackToLocal: boolean): PersistenceResult {
  if (fallbackToLocal) {
    try {
      addUserJournal(journal);
      return { source: "local", error };
    } catch {
      return { source: "none", error: "Browser storage is unavailable. Your journal entry was not saved." };
    }
  }

  return { source: "none", error };
}

export async function saveJournalInput(journal: UserJournalInput, { fallbackToLocal = true }: { fallbackToLocal?: boolean } = {}): Promise<PersistenceResult> {
  if (!isValidCalendarDate(journal.date) || !journal.city.trim() || !journal.sentence.trim()) {
    return { source: "none", error: "Enter a valid date, city, and journal sentence." };
  }
  if (journal.photos.some((photo) => photo.startsWith("data:"))) {
    return fallbackJournalSave(journal, "Journal photos could not be uploaded to cloud storage.", fallbackToLocal);
  }

  if (!supabase) {
    return fallbackJournalSave(journal, "Supabase is not configured.", fallbackToLocal);
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult?.user;

  if (userError || !user) {
    return fallbackJournalSave(journal, userError?.message ?? "User is not signed in.", fallbackToLocal);
  }

  const tripId = await getCurrentTripId();
  const journalPayload = {
    trip_id: tripId,
    user_id: user.id,
    date: journal.date,
    city: journal.city,
    photos: journal.photos,
    sentence: journal.sentence,
    story: journal.story,
  };
  const insertPayload = isUuid(journal.id) ? { id: journal.id, ...journalPayload } : journalPayload;
  const { error } = await supabase.from("journal").insert(insertPayload);

  if (error) {
    return fallbackJournalSave(journal, error.message, fallbackToLocal);
  }

  return { source: "supabase" };
}

export async function saveJournalStory(journalId: string, story: string): Promise<PersistenceResult> {
  if (!supabase) {
    updateUserJournalStory(journalId, story);
    return { source: "local", error: "Supabase is not configured." };
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult?.user;

  if (userError || !user) {
    updateUserJournalStory(journalId, story);
    return { source: "local", error: userError?.message ?? "User is not signed in." };
  }

  const { error } = await supabase
    .from("journal")
    .update({ story })
    .eq("id", journalId)
    .eq("user_id", user.id);

  if (error) {
    updateUserJournalStory(journalId, story);
    return { source: "local", error: error.message };
  }

  return { source: "supabase" };
}
