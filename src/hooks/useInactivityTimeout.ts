import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useInactivityTimeout = (timeoutMinutes: number = 30) => {
  const { logout, isAuthenticated, isInitialized } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const startDelayRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (startDelayRef.current) {
      clearTimeout(startDelayRef.current);
      startDelayRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }

    // Check if "Remember me" is enabled - if so, skip inactivity timeout
    const rememberMe = localStorage.getItem('rememberMe');
    if (rememberMe === 'true' || !isAuthenticated || !isInitializedRef.current) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = timeoutMs - (2 * 60 * 1000); // Warn 2 minutes before

    // Set warning timer
    warningRef.current = setTimeout(() => {
      toast.warning('You will be logged out in 2 minutes due to inactivity', {
        duration: 10000,
      });
    }, warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      toast.info('Logged out due to inactivity');
      logout();
    }, timeoutMs);
  }, [isAuthenticated, logout, timeoutMinutes]);

  useEffect(() => {
    // Don't start until auth is initialized
    if (!isInitialized || !isAuthenticated) {
      isInitializedRef.current = false;
      return;
    }

    // Check if "Remember me" is enabled
    const rememberMe = localStorage.getItem('rememberMe');
    if (rememberMe === 'true') {
      return;
    }

    // Delay starting the inactivity timer by 5 seconds to avoid race conditions
    startDelayRef.current = setTimeout(() => {
      isInitializedRef.current = true;
      
      // Track activity events
      const events = ['mousedown', 'keypress', 'touchstart', 'scroll', 'mousemove'];
      
      // Throttle the reset to avoid excessive calls
      let lastActivity = Date.now();
      const throttledReset = () => {
        const now = Date.now();
        if (now - lastActivity > 1000) { // Only reset if more than 1 second since last activity
          lastActivity = now;
          resetTimer();
        }
      };

      events.forEach((event) => window.addEventListener(event, throttledReset, { passive: true }));
      resetTimer();

      // Store cleanup function
      (window as any).__inactivityCleanup = () => {
        events.forEach((event) => window.removeEventListener(event, throttledReset));
      };
    }, 5000);

    return () => {
      clearTimers();
      if ((window as any).__inactivityCleanup) {
        (window as any).__inactivityCleanup();
        delete (window as any).__inactivityCleanup;
      }
    };
  }, [isAuthenticated, isInitialized, resetTimer, clearTimers]);
};
