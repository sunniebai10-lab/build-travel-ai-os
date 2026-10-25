import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";
import { dailyPlan } from "@/lib/mock-data";
import {
  cachePublicItineraryBaseline,
  findCachedPublicItineraryById,
  findCurrentUserCachedItineraryById,
  getCachedPublicItineraryBaseline,
  getUserItinerary,
  type ItineraryCategory,
  type PublicItinerarySnapshot,
  type UserItineraryRecord,
} from "@/lib/supabase/user-itinerary";

export interface PlannedItineraryRecord extends PublicItinerarySnapshot {}

export interface EffectiveItineraryItem {
  id: string;
  baseId: string | null;
  userItineraryId: string | null;
  tripId: string;
  date: string;
  time: string | null;
  city: string;
  title: string;
  location: string | null;
  category: ItineraryCategory | null;
  note: string | null;
  aiNote: string | null;
  source: "planned" | "spontaneous" | "override";
  isUserEditable: boolean;
  createdAt: string;
}

function sortEffectiveItems(left: EffectiveItineraryItem, right: EffectiveItineraryItem) {
  const dateOrder = left.date.localeCompare(right.date);
  if (dateOrder !== 0) return dateOrder;

  if (left.time && right.time) {
    const timeOrder = left.time.localeCompare(right.time);
    if (timeOrder !== 0) return timeOrder;
  } else if (left.time) {
    return -1;
  } else if (right.time) {
    return 1;
  }

  const createdAtOrder = left.createdAt.localeCompare(right.createdAt);
  if (createdAtOrder !== 0) return createdAtOrder;

  return left.id.localeCompare(right.id);
}

export function mergeEffectiveItinerary(
  baseline: PlannedItineraryRecord[],
  personalItinerary: UserItineraryRecord[],
): EffectiveItineraryItem[] {
  const overrides = new Map(
    personalItinerary
      .filter((item) => item.source === "override" && item.sourceItineraryId)
      .map((item) => [item.sourceItineraryId as string, item]),
  );

  const effective = baseline.flatMap<EffectiveItineraryItem>((base) => {
    const override = overrides.get(base.id);
    if (override?.status === "cancelled") return [];

    if (override) {
      return [{
        id: base.id,
        baseId: base.id,
        userItineraryId: override.id,
        tripId: base.tripId,
        date: override.date,
        time: override.time,
        city: override.city,
        title: override.title,
        location: override.location,
        category: override.category,
        note: override.note,
        aiNote: base.aiNote,
        source: "override",
        isUserEditable: true,
        createdAt: override.createdAt,
      }];
    }

    return [{
      id: base.id,
      baseId: base.id,
      userItineraryId: null,
      tripId: base.tripId,
      date: base.date,
      time: base.time,
      city: base.city,
      title: base.title,
      location: base.location,
      category: base.category,
      note: null,
      aiNote: base.aiNote,
      source: "planned",
      isUserEditable: false,
      createdAt: base.createdAt,
    }];
  });

  for (const item of personalItinerary) {
    if (item.source !== "spontaneous" || item.status === "cancelled") continue;

    effective.push({
      id: item.id,
      baseId: null,
      userItineraryId: item.id,
      tripId: item.tripId,
      date: item.date,
      time: item.time,
      city: item.city,
      title: item.title,
      location: item.location,
      category: item.category,
      note: item.note,
      aiNote: null,
      source: "spontaneous",
      isUserEditable: true,
      createdAt: item.createdAt,
    });
  }

  return effective.sort(sortEffectiveItems);
}

function getMockBaseline(tripId: string, date?: string): PlannedItineraryRecord[] {
  const fallback = dailyPlan.flatMap((day, dayIndex) => {
    const parsedDate = new Date(day.date);
    const normalizedDate = Number.isNaN(parsedDate.getTime()) ? day.date : parsedDate.toISOString().slice(0, 10);
    if (date && date !== normalizedDate) return [];

    return day.blocks.map((block, blockIndex) => ({
      id: `fallback-${tripId}-${dayIndex}-${blockIndex}`,
      tripId,
      date: normalizedDate,
      time: block.time || null,
      city: day.city,
      title: block.title,
      location: null,
      category: "Experience" as ItineraryCategory,
      aiNote: block.ai,
      createdAt: `${normalizedDate}T00:00:${String(dayIndex * 10 + blockIndex).padStart(2, "0")}Z`,
    }));
  });

  return fallback;
}

function getBaselineFallback(tripId: string, date?: string) {
  const cached = getCachedPublicItineraryBaseline(tripId, date);
  return cached.length ? cached : getMockBaseline(tripId, date);
}

export async function getEffectiveItinerary(tripId: string, date?: string): Promise<QueryResult<EffectiveItineraryItem[]>> {
  let baseline = getBaselineFallback(tripId, date);
  let baselineError: string | undefined;

  if (supabase) {
    try {
      let baselineQuery = supabase
        .from("itinerary")
        .select("id,trip_id,date,time,city,title,location,category,ai_note,created_at")
        .eq("trip_id", tripId)
        .order("date")
        .order("time", { nullsFirst: false })
        .order("created_at");

      if (date) baselineQuery = baselineQuery.eq("date", date);

      const { data: baselineData, error } = await baselineQuery;
      if (error || !baselineData) {
        baselineError = error?.message ?? "Planned itinerary was not found.";
      } else {
        baseline = baselineData.map((item) => ({
          id: item.id,
          tripId: item.trip_id ?? tripId,
          date: item.date,
          time: item.time,
          city: item.city,
          title: item.title,
          location: item.location,
          category: item.category,
          aiNote: item.ai_note,
          createdAt: item.created_at,
        }));
        cachePublicItineraryBaseline(tripId, baseline);
      }
    } catch (error) {
      baselineError = error instanceof Error ? error.message : "Planned itinerary could not be loaded.";
    }
  } else {
    baselineError = "Supabase is not configured.";
  }

  if (!supabase) {
    const personalResult = await getUserItinerary(tripId, date);
    return fallbackResult(mergeEffectiveItinerary(baseline, personalResult.data), baselineError);
  }

  const personalResult = await getUserItinerary(tripId, date);
  const effective = mergeEffectiveItinerary(baseline, personalResult.data);
  const error = baselineError ?? personalResult.error;

  return error ? fallbackResult(effective, error) : supabaseResult(effective);
}

export async function getEffectiveActivity(activityId: string, preferredTripId?: string): Promise<QueryResult<EffectiveItineraryItem | null>> {
  const checkedTripIds = new Set<string>();

  async function findInTrip(tripId: string) {
    if (!tripId || checkedTripIds.has(tripId)) return null;
    checkedTripIds.add(tripId);
    const result = await getEffectiveItinerary(tripId);
    return result.data.find((item) => item.id === activityId) ?? null;
  }

  const preferred = preferredTripId ? await findInTrip(preferredTripId) : null;
  if (preferred) return supabaseResult(preferred);

  const cachedPersonal = await findCurrentUserCachedItineraryById(activityId);
  const cachedPersonalMatch = cachedPersonal ? await findInTrip(cachedPersonal.tripId) : null;
  if (cachedPersonalMatch) return fallbackResult(cachedPersonalMatch, "Using locally cached itinerary activity.");

  const cachedPublic = findCachedPublicItineraryById(activityId);
  const cachedPublicMatch = cachedPublic ? await findInTrip(cachedPublic.tripId) : null;
  if (cachedPublicMatch) return fallbackResult(cachedPublicMatch, "Using locally cached itinerary activity.");

  if (supabase) {
    const [{ data: publicActivity }, { data: personalActivity }] = await Promise.all([
      supabase.from("itinerary").select("trip_id").eq("id", activityId).maybeSingle(),
      supabase.from("user_itinerary").select("trip_id").eq("id", activityId).maybeSingle(),
    ]);
    const publicMatch = publicActivity?.trip_id ? await findInTrip(publicActivity.trip_id) : null;
    if (publicMatch) return supabaseResult(publicMatch);

    const personalMatch = personalActivity?.trip_id ? await findInTrip(personalActivity.trip_id) : null;
    if (personalMatch) return supabaseResult(personalMatch);
  }

  return fallbackResult(null, "Activity was not found.");
}
