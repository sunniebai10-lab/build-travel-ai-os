import travelConfig from "@/travel.config.json";
import { dailyPlan, timeline } from "@/lib/mock-data";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";
import { formatDisplayDate, formatTime } from "@/lib/supabase/format";

export interface TimelineItemView {
  id?: string;
  time: string;
  title: string;
  detail: string;
}

export interface DailyPlanBlockView {
  id?: string;
  period: string;
  time: string;
  title: string;
  category: string;
  ai: string;
}

export interface DailyPlanView {
  date: string;
  city: string;
  blocks: DailyPlanBlockView[];
}

const fallbackDailyPlan: DailyPlanView[] = dailyPlan.map((day) => ({
  ...day,
  blocks: day.blocks.map((block) => ({ ...block, category: "Experience" })),
}));

export async function getItinerary(): Promise<QueryResult<{ timeline: TimelineItemView[]; dailyPlan: DailyPlanView[]; count: number }>> {
  if (!supabase) {
    return fallbackResult({ timeline, dailyPlan: fallbackDailyPlan, count: fallbackDailyPlan[0]?.blocks.length ?? 0 }, "Supabase environment variables are not configured.");
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", travelConfig.tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!trip) {
    return fallbackResult({ timeline, dailyPlan: fallbackDailyPlan, count: fallbackDailyPlan[0]?.blocks.length ?? 0 }, "Trip data was not found.");
  }

  const { data, error } = await supabase
    .from("itinerary")
    .select("id,date,city,time,title,location,category,ai_note")
    .eq("trip_id", trip.id)
    .order("date")
    .order("time", { nullsFirst: false });

  if (error || !data?.length) {
    return fallbackResult({ timeline, dailyPlan: fallbackDailyPlan, count: fallbackDailyPlan[0]?.blocks.length ?? 0 }, error?.message ?? "Itinerary data was not found.");
  }

  const firstDay = data[0].date;
  const firstDayItems = data.filter((item) => item.date === firstDay).slice(0, 4);
  const timelineItems = firstDayItems.map((item) => ({
    id: item.id,
    time: formatTime(item.time),
    title: item.title,
    detail: item.ai_note ?? item.location ?? item.city,
  }));

  const byDate = new Map<string, typeof data>();
  for (const item of data) {
    byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  }

  const daily = [...byDate.entries()].map(([date, items]) => ({
    date: formatDisplayDate(date),
    city: items[0]?.city ?? "",
    blocks: items.map((item) => ({
      id: item.id,
      period: item.category ?? "Experience",
      time: formatTime(item.time),
      title: item.title,
      category: item.category ?? "Experience",
      ai: item.ai_note ?? "暂无详细说明。",
    })),
  }));

  return supabaseResult({
    timeline: timelineItems.length ? timelineItems : timeline,
    dailyPlan: daily,
    count: data.length,
  });
}
