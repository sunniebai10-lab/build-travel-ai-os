import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";

export interface CultureEntryView {
  country: string;
  category: string;
  title: string;
  content: string;
}

export async function getCultureEntries(): Promise<QueryResult<CultureEntryView[]>> {
  if (!supabase) {
    return fallbackResult([], "Supabase environment variables are not configured.");
  }

  const { data, error } = await supabase.from("culture").select("country,category,title,content").order("country");

  if (error || !data) {
    return fallbackResult([], error?.message ?? "Culture entries were not found.");
  }

  return supabaseResult(data);
}
