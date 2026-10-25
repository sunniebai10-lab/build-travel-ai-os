import travelConfig from "@/travel.config.json";
import { trip as fallbackTrip } from "@/lib/mock-data";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";
import { formatDateRange } from "@/lib/supabase/format";

export interface TripView {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dateRange: string;
  currentDay: number;
  totalDays: number;
  flags: string[];
  budget: number;
  currency: string;
  spent: number;
  remaining: number;
  today: {
    city: string;
    weather: string;
    budget: string;
    culture: string;
  };
}

const fallbackTripView = {
  ...fallbackTrip,
  startDate: travelConfig.startDate,
  endDate: travelConfig.endDate,
  dateRange: `${travelConfig.startDate} - ${travelConfig.endDate}`,
  totalDays: fallbackTrip.totalDays,
  currency: travelConfig.currency,
};

export async function getTrip(): Promise<QueryResult<TripView>> {
  if (!supabase) {
    return fallbackResult(fallbackTripView, "Supabase environment variables are not configured.");
  }

  const { data, error } = await supabase
    .from("trips")
    .select("id,name,start_date,end_date,budget,currency")
    .eq("id", travelConfig.tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return fallbackResult(fallbackTripView, error?.message ?? "Trip data was not found.");
  }

  const spent = 0;
  return supabaseResult({
    id: data.id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
    dateRange: formatDateRange(data.start_date, data.end_date),
    currentDay: fallbackTrip.currentDay,
    totalDays: Math.max(
      1,
      Math.round((new Date(`${data.end_date}T00:00:00Z`).getTime() - new Date(`${data.start_date}T00:00:00Z`).getTime()) / 86400000) + 1,
    ),
    flags: fallbackTrip.flags,
    budget: Number(data.budget),
    currency: data.currency,
    spent,
    remaining: Number(data.budget) - spent,
    today: fallbackTrip.today,
  });
}
