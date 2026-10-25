import travelConfig from "@/travel.config.json";
import { countries as fallbackCountries } from "@/lib/mock-data";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";
import { parseJsonArray } from "@/lib/supabase/format";

export interface CountryView {
  id?: string;
  name: string;
  code: string;
  flag: string;
  history: string[];
  culture: string[];
  taboo: string[];
}

const fallback: CountryView[] = fallbackCountries.map((country) => ({
  name: country.name,
  code: country.flag,
  flag: country.flag,
  history: country.history,
  culture: country.culture,
  taboo: country.taboo,
}));

export async function getCountries(): Promise<QueryResult<CountryView[]>> {
  if (!supabase) return fallbackResult(fallback, "Supabase is not configured.");
  const codes = [...new Set(travelConfig.cities.map((city) => city.code).filter(Boolean))];
  if (!codes.length) return fallbackResult(fallback);
  const { data, error } = await supabase.from("countries")
    .select("id,name,code,flag,history,culture,taboo")
    .in("code", codes);
  if (error || !data?.length) return fallbackResult(fallback, error?.message ?? "Country data was not found.");
  const byCode = new Map(data.map((country) => [country.code, country]));
  return supabaseResult(codes.flatMap((code) => {
    const country = byCode.get(code);
    return country ? [{
      id: country.id,
      name: country.name,
      code: country.code ?? country.name,
      flag: country.flag ?? country.code ?? country.name,
      history: parseJsonArray(country.history),
      culture: parseJsonArray(country.culture),
      taboo: parseJsonArray(country.taboo),
    }] : [];
  }));
}
