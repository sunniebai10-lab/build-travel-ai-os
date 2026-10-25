import travelConfig from "@/travel.config.json";
import { NextResponse } from "next/server";
import { generateTripMemory } from "@/lib/ai/trip-memory";
import { getDefaultUserContext } from "@/lib/ai/user-profile";
import type { TripMemoryContext, TripMemoryInsight } from "@/lib/ai/types";
import { mergeEffectiveItinerary, type PlannedItineraryRecord } from "@/lib/supabase/effective-itinerary";
import { authorizeAIRequest } from "@/lib/supabase/server-ai-auth";
import type { UserItineraryRecord } from "@/lib/supabase/user-itinerary";

export const runtime = "nodejs";

function normalizePhotos(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

type HistoricalItineraryItem = Pick<
  PlannedItineraryRecord | UserItineraryRecord,
  "id" | "date" | "city" | "title" | "category"
>;

function readActivityIndex(activityId: string) {
  const match = activityId.match(/^activity-(\d+)$/);
  return match ? Number(match[1]) : -1;
}

function resolveHistoricalActivity(
  activityId: string,
  effectiveItinerary: HistoricalItineraryItem[],
  personalItinerary: UserItineraryRecord[],
  baseline: PlannedItineraryRecord[],
): HistoricalItineraryItem | null {
  return effectiveItinerary.find((item) => item.id === activityId)
    ?? personalItinerary.find((item) => item.id === activityId)
    ?? personalItinerary.find((item) => item.source === "override" && item.sourceItineraryId === activityId)
    ?? baseline.find((item) => item.id === activityId)
    ?? baseline[readActivityIndex(activityId)]
    ?? null;
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeAIRequest(request);
    if (!authorization.authorized) {
      return NextResponse.json({ status: "error", error: authorization.error }, { status: authorization.status });
    }

    const body = (await request.json()) as { aiInsights?: TripMemoryInsight[] };
    const client = authorization.client;
    const userId = authorization.user.id;

    const { data: trip, error: tripError } = await client
      .from("trips")
      .select("id,name,start_date,end_date")
      .eq("id", travelConfig.tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        {
          status: "error",
          error: "Current trip was not found.",
        },
        { status: 404 },
      );
    }

    const [itineraryResult, journalResult, activityResult, userItineraryResult] = await Promise.all([
      client.from("itinerary").select("id,trip_id,date,time,city,title,location,category,ai_note,created_at").eq("trip_id", trip.id).order("date").order("time", { nullsFirst: false }),
      client.from("journal").select("date,city,sentence,story,photos").eq("trip_id", trip.id).eq("user_id", userId).order("date"),
      client.from("activity_state").select("activity_id,completed,completed_at").eq("trip_id", trip.id).eq("user_id", userId),
      client.from("user_itinerary").select("id,user_id,trip_id,source_itinerary_id,date,time,city,title,location,category,note,source,status,created_at,updated_at").eq("trip_id", trip.id).eq("user_id", userId),
    ]);

    if (itineraryResult.error) {
      return NextResponse.json(
        {
          status: "error",
          error: "Trip memory data could not be loaded.",
        },
        { status: 500 },
      );
    }

    const baseline: PlannedItineraryRecord[] = (itineraryResult.data ?? []).map((item) => ({
      id: item.id,
      tripId: item.trip_id ?? trip.id,
      date: item.date,
      time: item.time,
      city: item.city,
      title: item.title,
      location: item.location,
      category: item.category,
      aiNote: item.ai_note,
      createdAt: item.created_at,
    }));
    const personal: UserItineraryRecord[] = (userItineraryResult.error ? [] : userItineraryResult.data ?? []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      tripId: item.trip_id,
      sourceItineraryId: item.source_itinerary_id,
      date: item.date,
      time: item.time,
      city: item.city,
      title: item.title,
      location: item.location,
      category: item.category,
      note: item.note,
      source: item.source,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
    const effectiveItinerary = mergeEffectiveItinerary(baseline, personal);
    const itinerary = effectiveItinerary.map((item) => ({
      date: item.date,
      city: item.city,
      title: item.title,
      category: item.category ?? undefined,
      aiNote: item.aiNote ?? undefined,
    }));
    const journals = (journalResult.error ? [] : journalResult.data ?? []).map((journal) => ({
      date: journal.date,
      city: journal.city,
      sentence: journal.sentence ?? "",
      story: journal.story ?? undefined,
      photos: normalizePhotos(journal.photos),
    })).filter((journal) => journal.sentence || journal.story || journal.photos.length);
    const activityStates = activityResult.error ? [] : activityResult.data ?? [];
    const activityStateById = new Map(activityStates.map((activity) => [activity.activity_id, activity]));
    const completedActivities = activityStates.flatMap((activity) => {
      if (!activity.completed) return [];

      const legacyIndex = readActivityIndex(activity.activity_id);
      const canonicalId = legacyIndex >= 0 ? baseline[legacyIndex]?.id : undefined;
      if (canonicalId && activityStateById.has(canonicalId)) {
        return [];
      }

      const itineraryItem = resolveHistoricalActivity(
        activity.activity_id,
        effectiveItinerary,
        personal,
        baseline,
      );
      if (!itineraryItem) return [];

      return [{
        title: itineraryItem.title,
        city: itineraryItem.city,
        date: itineraryItem.date,
        category: itineraryItem.category ?? undefined,
        completedAt: activity.completed_at ?? undefined,
      }];
    });
    const cities = [...new Set(itinerary.map((item) => item.city).filter(Boolean))];
    const aiInsights = Array.isArray(body.aiInsights)
      ? body.aiInsights
          .filter((insight) => insight && typeof insight.summary === "string" && cities.includes(insight.city))
          .slice(0, 12)
      : [];
    const profile = getDefaultUserContext();
    const context: TripMemoryContext = {
      trip: { id: trip.id, name: trip.name, startDate: trip.start_date, endDate: trip.end_date, cities },
      journals,
      completedActivities,
      itinerary,
      aiInsights,
      userContext: {
        travelStyle: profile.travelStyle,
        interests: profile.interests,
        contentPreference: profile.contentPreference,
      },
    };

    const memory = await generateTripMemory(context);
    return NextResponse.json({
      status: "success",
      memory,
      context,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown request error.";
    return NextResponse.json(
      {
        status: "error",
        error: message,
      },
      { status: 500 },
    );
  }
}
