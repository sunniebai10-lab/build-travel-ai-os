import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createBrowserClient<Database>(
      supabaseUrl as string,
      supabaseAnonKey as string,
      {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    )
  : null;

export type DataSource = "supabase" | "fallback";

export interface QueryResult<T> {
  data: T;
  source: DataSource;
  error?: string;
}

export function fallbackResult<T>(data: T, error?: string): QueryResult<T> {
  return { data, source: "fallback", error };
}

export function supabaseResult<T>(data: T): QueryResult<T> {
  return { data, source: "supabase" };
}

export function getSupabaseRuntimeStatus() {
  return isSupabaseConfigured
    ? {
        connected: true,
        label: "Connected to Supabase",
      }
    : {
        connected: false,
        label: "Using Mock Data - Supabase Not Connected",
      };
}
