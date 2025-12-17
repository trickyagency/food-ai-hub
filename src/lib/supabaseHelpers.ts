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
    // Get current session
    let session = await getCurrentSession();

    if (!session) {
      return { data: null, error: new Error("No authenticated session") };
    }

    // Proactively refresh if token is expiring soon (within 60 seconds)
    if (isTokenExpiringSoon(session, 60)) {
      console.log("[invokeWithRetry] Token expiring soon, refreshing...");
      const refreshResult = await safeRefreshSession();
      if (!refreshResult.success || !refreshResult.session) {
        return { data: null, error: new Error("Session refresh failed") };
      }
      session = refreshResult.session;
    }

    const buildOptions = () => ({
      ...options,
      headers: {
        ...(options?.headers ?? {}),
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    // First attempt
    const first = await supabase.functions.invoke(functionName, buildOptions());

    if (first.error) {
      const msg = first.error.message || "";
      const isAuthError =
        msg.includes("401") ||
        msg.toLowerCase().includes("invalid jwt") ||
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("jwt expired");

      if (isAuthError) {
        console.log("[invokeWithRetry] Auth error, attempting refresh...");
        const refreshResult = await safeRefreshSession();
        if (!refreshResult.success || !refreshResult.session) {
          return { data: null, error: new Error(first.error.message) };
        }
        session = refreshResult.session;

        const retry = await supabase.functions.invoke(functionName, buildOptions());
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
    
    if (!session) {
      return false;
    }
    
    // Check if token is expiring soon (within 60 seconds)
    if (isTokenExpiringSoon(session, 60)) {
      console.log("[ensureValidSession] Token expiring soon, refreshing...");
      const result = await safeRefreshSession();
      return result.success;
    }
    
    return true;
  } catch (err) {
    console.error("[ensureValidSession] Error:", err);
    return false;
  }
}
