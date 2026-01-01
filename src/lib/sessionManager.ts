import { supabase } from "@/integrations/supabase/client";

// Singleton to prevent concurrent session refreshes
let isRefreshing = false;
let refreshPromise: Promise<{ success: boolean; session: any }> | null = null;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN_MS = 120000; // 120 seconds cooldown to prevent rate limiting

// Login grace period - prevents any refresh for 10 seconds after login
let loginGracePeriodUntil = 0;
const LOGIN_GRACE_PERIOD_MS = 10000; // 10 seconds

/**
 * Activate login grace period to prevent token refresh storms after login.
 * Call this immediately after successful login.
 */
export function setLoginGracePeriod(): void {
  loginGracePeriodUntil = Date.now() + LOGIN_GRACE_PERIOD_MS;
  console.log('[SessionManager] Login grace period active for 10 seconds');
}

/**
 * Check if we're within the login grace period.
 */
export function isInLoginGracePeriod(): boolean {
  return Date.now() < loginGracePeriodUntil;
}

/**
 * Safely refresh the session with deduplication and cooldown.
 * Prevents rate limiting by enforcing a 60 second cooldown.
 */
export async function safeRefreshSession(): Promise<{ success: boolean; session: any }> {
  const now = Date.now();
  
  // Skip refresh during login grace period to prevent token storm
  if (isInLoginGracePeriod()) {
    console.log('[SessionManager] In login grace period, skipping refresh');
    const { data: { session } } = await supabase.auth.getSession();
    return { success: !!session, session };
  }
  
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
 * NOTE: This is rarely needed - Supabase auto-refreshes tokens automatically
 */
export function isTokenExpiringSoon(session: any, thresholdSeconds: number = 30): boolean {
  if (!session?.expires_at) return false; // Don't treat missing expires_at as expiring
  const now = Math.floor(Date.now() / 1000);
  return (session.expires_at - now) < thresholdSeconds;
}
