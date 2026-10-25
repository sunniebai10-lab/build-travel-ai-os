import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export interface AuthSessionState {
  configured: boolean;
  session: Session | null;
  error?: string;
}

export async function getAuthSession(): Promise<AuthSessionState> {
  if (!supabase) {
    return { configured: false, session: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.auth.getSession();
  await supabase.auth.getUser();

  return {
    configured: isSupabaseConfigured,
    session: data.session,
    error: error?.message,
  };
}

export async function getAuthRequestHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  if (!supabase) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const { data, error: sessionError } = await supabase.auth.getSession();
  return {
    error: sessionError?.message ?? (data.session ? undefined : "登录会话未能保存，请重试。"),
  };
}

export async function signOut() {
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error?.message };
}
