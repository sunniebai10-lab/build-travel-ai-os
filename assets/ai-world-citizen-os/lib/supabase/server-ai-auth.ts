import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AIRequestAuthorization =
  | {
      authorized: true;
      user: User;
      client: SupabaseClient<Database>;
      authVia: "bearer" | "cookie";
    }
  | { authorized: false; status: 401 | 403 | 503; error: string };

/** Validates the caller token before any server-side AI provider work begins. */
export async function authorizeAIRequest(request: Request): Promise<AIRequestAuthorization> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { authorized: false, status: 503, error: "Supabase authentication is not configured." };
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (accessToken) {
    const verificationClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await verificationClient.auth.getUser(accessToken);
    const user = data.user;

    if (error || !user) {
      return { authorized: false, status: 401, error: "Your sign-in session is no longer valid." };
    }

    const allowedEmail = process.env.BETA_ALLOWED_EMAIL?.trim().toLowerCase();
    if (allowedEmail && user.email?.trim().toLowerCase() !== allowedEmail) {
      return { authorized: false, status: 403, error: "This Personal Beta is not available for this account." };
    }

    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return { authorized: true, user, client, authVia: "bearer" };
  }

  try {
    const client = await createServerSupabaseClient(new NextResponse());
    const { data, error } = await client.auth.getUser();
    const user = data.user;
    const getUserSuccess = !error && Boolean(user);

    if (getUserSuccess && user) {
      const allowedEmail = process.env.BETA_ALLOWED_EMAIL?.trim().toLowerCase();
      if (allowedEmail && user.email?.trim().toLowerCase() !== allowedEmail) {
        return { authorized: false, status: 403, error: "This Personal Beta is not available for this account." };
      }

      return { authorized: true, user, client, authVia: "cookie" };
    }
  } catch {
    // Preserve the same generic unauthenticated response.
  }

  return { authorized: false, status: 401, error: "Sign in is required to use AI." };
}
