import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { safeRefreshSession } from '@/lib/sessionManager';

export const useAutoSessionExtend = () => {
  const { session, isAuthenticated, isInitialized } = useAuth();
  const lastRefreshAttempt = useRef<number>(0);
  const loginTimeRef = useRef<number>(Date.now());

  // Track when session changes (new login)
  useEffect(() => {
    if (session?.access_token) {
      loginTimeRef.current = Date.now();
    }
  }, [session?.access_token]);

  const attemptRefresh = useCallback(async () => {
    const now = Date.now();
    // Debounce: only attempt refresh once every 30 seconds
    if (now - lastRefreshAttempt.current < 30000) {
      return;
    }
    
    // Grace period: don't refresh within 10 seconds of login
    if (now - loginTimeRef.current < 10000) {
      return;
    }
    
    lastRefreshAttempt.current = now;
    
    try {
      const result = await safeRefreshSession();
      if (result.success) {
        console.log('[Session] Auto-extended successfully');
      }
    } catch (error) {
      console.error('[Session] Auto-extend failed:', error);
    }
  }, []);

  const checkAndExtend = useCallback(() => {
    if (!session?.expires_at || !isAuthenticated || !isInitialized) {
      return;
    }

    // Grace period: don't check within 10 seconds of login
    if (Date.now() - loginTimeRef.current < 10000) {
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = session.expires_at - now;

    // If less than 10 minutes remaining, refresh silently
    if (timeUntilExpiry <= 600 && timeUntilExpiry > 0) {
      attemptRefresh();
    }
  }, [session, isAuthenticated, isInitialized, attemptRefresh]);

  // Periodic check every 5 minutes
  useEffect(() => {
    if (!isAuthenticated || !session?.expires_at || !isInitialized) {
      return;
    }

    // Initial check after 10 second delay (grace period)
    const initialCheck = setTimeout(checkAndExtend, 10000);
    
    // Then check every 5 minutes
    const interval = setInterval(checkAndExtend, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [isAuthenticated, session, isInitialized, checkAndExtend]);

  // Activity-based extension
  useEffect(() => {
    if (!isAuthenticated || !session?.expires_at || !isInitialized) {
      return;
    }

    let lastActivity = Date.now();
    
    const handleActivity = () => {
      const now = Date.now();
      // Throttle to once per 30 seconds
      if (now - lastActivity < 30000) {
        return;
      }
      lastActivity = now;
      checkAndExtend();
    };

    const events = ['click', 'keypress', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, session, isInitialized, checkAndExtend]);
};
