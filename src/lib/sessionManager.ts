import { supabase } from "@/integrations/supabase/client";

// Singleton to prevent concurrent session refreshes
let isRefreshing = false;
let refreshPromise: Promise<{ success: boolean; session: any }> | null = null;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN_MS = 60000; // 60 seconds cooldown between refreshes

/**
 * Safely refresh the session with deduplication and cooldown.
 * Prevents rate limiting by enforcing a 60 second cooldown.
 */
export async function safeRefreshSession(): Promise<{ success: boolean; session: any }> {
  const now = Date.now();
  
  // Enforce cooldown to prevent rate limiting
  if (now - lastRefreshTime < REFRESH_COOLDOWN_MS) {
    console.log('[SessionManager] Refresh on cooldown, skipping');
    // Return current session without refreshing
    const { data: { session } } = await supabase.auth.getSession();
    return { success: !!session, session };
  }

  // If already refreshing, wait for existing refresh
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Check if there's a session to refresh
  const { data: { session: currentSession } } = await supabase.auth.getSession();
  if (!currentSession) {
    return { success: false, session: null };
  }

  isRefreshing = true;
  lastRefreshTime = now;

  refreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error("[SessionManager] Refresh failed:", error?.message);
        return { success: false, session: null };
      }
      
      console.log('[SessionManager] Session refreshed successfully');
      return { success: true, session: data.session };
    } catch (err) {
      console.error("[SessionManager] Refresh error:", err);
      return { success: false, session: null };
    } finally {
      // Clear refresh state after a short delay
      setTimeout(() => {
        isRefreshing = false;
        refreshPromise = null;
      }, 2000);
    }
  })();

  return refreshPromise;
}

/**
 * Get the current session without triggering a refresh.
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
  if (!session?.expires_at) return false; // Don't treat missing expires_at as expiring
  const now = Math.floor(Date.now() / 1000);
  return (session.expires_at - now) < thresholdSeconds;
}
