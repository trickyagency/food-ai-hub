import { supabase } from "@/integrations/supabase/client";
import { safeRefreshSession, getCurrentSession, isTokenExpiringSoon } from "./sessionManager";

/**
 * Invokes a Supabase edge function with a guaranteed user JWT (never the anon key).
 * Uses centralized session manager to prevent concurrent refresh attempts.
 */
export async function invokeWithRetry<T = any>(
  functionName: string,
  options?: { body?: Record<string, any>; headers?: Record<string, string> }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // Get current session - don't proactively refresh, let Supabase handle it
    let session = await getCurrentSession();

    if (!session) {
      return { data: null, error: new Error("No authenticated session") };
    }

    const buildOptions = (currentSession: typeof session) => ({
      ...options,
      headers: {
        ...(options?.headers ?? {}),
        Authorization: `Bearer ${currentSession!.access_token}`,
      },
    });

    // First attempt - use current session as-is
    const first = await supabase.functions.invoke(functionName, buildOptions(session));

    if (first.error) {
      const msg = first.error.message || "";
      const isAuthError =
        msg.includes("401") ||
        msg.toLowerCase().includes("invalid jwt") ||
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("jwt expired");

      // Only refresh on actual auth errors, not preemptively
      if (isAuthError) {
        console.log("[invokeWithRetry] Auth error, attempting single refresh...");
        const refreshResult = await safeRefreshSession();
        if (!refreshResult.success || !refreshResult.session) {
          return { data: null, error: new Error(first.error.message) };
        }
        session = refreshResult.session;

        const retry = await supabase.functions.invoke(functionName, buildOptions(session));
        if (retry.error) {
          return { data: null, error: new Error(retry.error.message) };
        }
        return { data: retry.data as T, error: null };
      }

      return { data: null, error: new Error(first.error.message) };
    }

    return { data: first.data as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: new Error(message) };
  }
}

/**
 * Ensures the session is valid before making API calls.
 * Uses centralized session manager for refresh.
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const session = await getCurrentSession();
    // Simply check if session exists - Supabase auto-refreshes tokens
    return !!session;
  } catch (err) {
    console.error("[ensureValidSession] Error:", err);
    return false;
  }
}
