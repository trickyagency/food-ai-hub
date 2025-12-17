import { supabase } from "@/integrations/supabase/client";

// Singleton to prevent concurrent session refreshes (thundering herd problem)
let isRefreshing = false;
let refreshPromise: Promise<{ success: boolean; session: any }> | null = null;

/**
 * Safely refresh the session with deduplication.
 * If a refresh is already in progress, returns the existing promise.
 * This prevents multiple components from triggering concurrent refreshes
 * which can cause rate limiting and token revocation.
 */
export async function safeRefreshSession(): Promise<{ success: boolean; session: any }> {
  // If already refreshing, wait for existing refresh
  if (isRefreshing && refreshPromise) {
    console.log("[SessionManager] Refresh already in progress, waiting...");
    return refreshPromise;
  }

  isRefreshing = true;
  console.log("[SessionManager] Starting session refresh...");

  refreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error("[SessionManager] Refresh failed:", error?.message);
        return { success: false, session: null };
      }
      
      console.log("[SessionManager] Refresh successful");
      return { success: true, session: data.session };
    } catch (err) {
      console.error("[SessionManager] Refresh error:", err);
      return { success: false, session: null };
    } finally {
      // Reset after a small delay to allow subsequent refreshes
      setTimeout(() => {
        isRefreshing = false;
        refreshPromise = null;
      }, 1000);
    }
  })();

  return refreshPromise;
}

/**
 * Get the current session without triggering a refresh.
 * Use this for quick session checks.
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[SessionManager] Error getting session:", error);
    return null;
  }
  return session;
}

/**
 * Check if token is expiring soon (within threshold seconds)
 */
export function isTokenExpiringSoon(session: any, thresholdSeconds: number = 60): boolean {
  if (!session?.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  return (session.expires_at - now) < thresholdSeconds;
}
