import travelConfig from "@/travel.config.json";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";

export interface AccommodationView {
  city: string;
  hotelName: string;
  price: number | null;
  currency: string;
  checkIn: string | null;
  checkOut: string | null;
}

export async function getAccommodations(): Promise<QueryResult<AccommodationView[]>> {
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
    .from("accommodations")
    .select("city,hotel_name,price,currency,check_in,check_out")
    .eq("trip_id", trip.id)
    .not("price", "is", null)
    .order("check_in");

  if (error || !data) {
    return fallbackResult([], error?.message ?? "Accommodation data was not found.");
  }

  return supabaseResult(
    data.map((item) => ({
      city: item.city,
      hotelName: item.hotel_name,
      price: item.price == null ? null : Number(item.price),
      currency: item.currency ?? travelConfig.currency,
      checkIn: item.check_in,
      checkOut: item.check_out,
    })),
  );
}
