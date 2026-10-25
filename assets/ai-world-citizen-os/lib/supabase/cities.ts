import travelConfig from "@/travel.config.json";
import { routeCities as fallbackRouteCities } from "@/lib/mock-data";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";

export interface RouteCityView {
  id?: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  days: string;
  description?: string;
}

export async function getRouteCities(): Promise<QueryResult<RouteCityView[]>> {
  if (!supabase) return fallbackResult(fallbackRouteCities, "Supabase is not configured.");

  const names = [...new Set(travelConfig.cities.map((city) => city.name))];
  const { data, error } = await supabase.from("cities")
    .select("id,name,latitude,longitude,description")
    .in("name", names);

  if (error || !data?.length) return fallbackResult(fallbackRouteCities, error?.message ?? "City data was not found.");

  const byName = new Map(data.map((city) => [city.name, city]));
  const cities = travelConfig.cities.map((configuredCity, index) => {
    const city = byName.get(configuredCity.name);
    return {
      id: city ? `${city.id}-${index}` : undefined,
      name: configuredCity.name,
      country: configuredCity.country,
      lat: city?.latitude == null ? configuredCity.lat : Number(city.latitude),
      lng: city?.longitude == null ? configuredCity.lng : Number(city.longitude),
      days: "",
      description: city?.description ?? "",
    };
  });
  return supabaseResult(cities);
}
