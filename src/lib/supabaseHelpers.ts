import { supabase } from "@/integrations/supabase/client";

/**
 * Invokes a Supabase edge function with automatic JWT refresh on 401 errors.
 * This handles the case where the token expires between auth checks and the actual API call.
 */
export async function invokeWithRetry<T = any>(
  functionName: string,
  options?: { body?: Record<string, any> }
): Promise<{ data: T | null; error: Error | null }> {
  // First attempt
  const { data, error } = await supabase.functions.invoke(functionName, options);

  // If we get a 401, try to refresh the session and retry once
  if (error?.message?.includes("401") || error?.message?.includes("Invalid JWT")) {
    console.log(`Got 401 from ${functionName}, attempting session refresh...`);
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session) {
      console.error("Session refresh failed:", refreshError);
      // Return the original error since we couldn't refresh
      return { data: null, error };
    }
    
    console.log("Session refreshed, retrying edge function call...");
    
    // Retry the call with the new session
    const retryResult = await supabase.functions.invoke(functionName, options);
    
    if (retryResult.error) {
      return { data: null, error: new Error(retryResult.error.message) };
    }
    
    return { data: retryResult.data as T, error: null };
  }

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as T, error: null };
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
