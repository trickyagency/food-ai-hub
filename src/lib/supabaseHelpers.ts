import { supabase } from "@/integrations/supabase/client";

/**
 * Invokes a Supabase edge function with a guaranteed user JWT (never the anon key).
 * Automatically refreshes tokens on auth-related failures.
 */
export async function invokeWithRetry<T = any>(
  functionName: string,
  options?: { body?: Record<string, any>; headers?: Record<string, string> }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // Ensure we have a valid session BEFORE making the call
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;

    if (!session) {
      return { data: null, error: new Error("No authenticated session") };
    }

    // Proactively refresh if token is close to expiry
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

    if (timeUntilExpiry < 30) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        return { data: null, error: new Error("Session refresh failed") };
      }
      session = refreshData.session;
    }

    const buildOptions = () => ({
      ...options,
      headers: {
        ...(options?.headers ?? {}),
        // Force the user JWT (prevents anon-token calls that lead to Unauthorized)
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
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          return { data: null, error: new Error(first.error.message) };
        }
        session = refreshData.session;

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
 * Call this before critical operations that require authentication.
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return false;
    }
    
    // Check if token is expired or expiring soon (within 60 seconds)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
    
    if (timeUntilExpiry < 60) {
      console.log("Token expiring soon, refreshing...");
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Failed to refresh session:", refreshError);
        return false;
      }
    }
    
    return true;
  } catch (err) {
    console.error("Error checking session:", err);
    return false;
  }
}
