import travelConfig from "@/travel.config.json";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";

export interface TransportationView {
  from: string;
  to: string;
  type: string;
  date: string | null;
  time: string | null;
  price: number | null;
  currency: string;
}

export async function getTransportation(): Promise<QueryResult<TransportationView[]>> {
  if (!supabase) {
    return fallbackResult([], "Supabase environment variables are not configured.");
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", travelConfig.tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!trip) {
    return fallbackResult([], "Trip data was not found.");
  }

  const { data, error } = await supabase
    .from("transportation")
    .select("from,to,type,date,time,price,currency")
    .eq("trip_id", trip.id)
    .order("date");

  if (error || !data) {
    return fallbackResult([], error?.message ?? "Transportation data was not found.");
  }

  return supabaseResult(
    data.map((item) => ({
      from: item.from,
      to: item.to,
      type: item.type,
      date: item.date,
      time: item.time,
      price: item.price == null ? null : Number(item.price),
      currency: item.currency ?? travelConfig.currency,
    })),
  );
}
