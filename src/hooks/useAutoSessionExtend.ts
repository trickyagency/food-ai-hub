import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { safeRefreshSession } from '@/lib/sessionManager';

export const useAutoSessionExtend = () => {
  const { session, isAuthenticated } = useAuth();
  const lastRefreshAttempt = useRef<number>(0);
  const isRefreshing = useRef(false);

  const attemptRefresh = useCallback(async () => {
    if (isRefreshing.current) return;
    
    const now = Date.now();
    // Prevent refresh attempts more than once per minute
    if (now - lastRefreshAttempt.current < 60000) return;
    
    isRefreshing.current = true;
    lastRefreshAttempt.current = now;
    
    try {
      const result = await safeRefreshSession();
      if (result.success) {
        console.log('[Session] Auto-extended successfully');
      }
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  const checkAndExtend = useCallback(() => {
    if (!session?.expires_at) return;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = session.expires_at - now;
    
    // If less than 10 minutes remaining, refresh silently
    if (timeUntilExpiry <= 600 && timeUntilExpiry > 0) {
      attemptRefresh();
    }
  }, [session, attemptRefresh]);

  // Periodic check every 5 minutes
  useEffect(() => {
    if (!isAuthenticated || !session?.expires_at) return;
    
    const interval = setInterval(checkAndExtend, 5 * 60 * 1000);
    
    // Initial check
    checkAndExtend();
    
    return () => clearInterval(interval);
  }, [isAuthenticated, session, checkAndExtend]);

  // Activity-based extension (debounced)
  useEffect(() => {
    if (!isAuthenticated || !session?.expires_at) return;
    
    let activityTimeout: NodeJS.Timeout;
    
    const handleActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        checkAndExtend();
      }, 1000); // Debounce activity
    };
    
    const events = ['click', 'keypress', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      clearTimeout(activityTimeout);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, session, checkAndExtend]);
};
