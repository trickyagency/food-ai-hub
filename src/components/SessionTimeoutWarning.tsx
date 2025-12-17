import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { safeRefreshSession } from '@/lib/sessionManager';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, RefreshCw, LogOut } from 'lucide-react';

const SessionTimeoutWarning = () => {
  const { session, logout, isAuthenticated, loading, isInitialized } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExtending, setIsExtending] = useState(false);
  const loginTimeRef = useRef<number>(Date.now());

  // Track when session changes (new login)
  useEffect(() => {
    if (session?.access_token) {
      loginTimeRef.current = Date.now();
    }
  }, [session?.access_token]);

  useEffect(() => {
    // Don't check until auth is fully initialized and not loading
    if (!isInitialized || loading) {
      return;
    }

    if (!session?.expires_at || !isAuthenticated) {
      setShowWarning(false);
      return;
    }

    const checkExpiry = () => {
      // Grace period: don't check for 10 seconds after login
      const timeSinceLogin = Date.now() - loginTimeRef.current;
      if (timeSinceLogin < 10000) {
        return;
      }

      // Skip if expires_at is invalid
      if (!session?.expires_at || session.expires_at <= 0) {
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const remaining = session.expires_at - now;

      // Show warning when 5 minutes (300 seconds) or less remaining
      if (remaining <= 300 && remaining > 0) {
        setShowWarning(true);
        setTimeRemaining(remaining);
      } else if (remaining <= 0) {
        // Session might be expired - but don't auto-logout
        // The auto-session-extend hook should handle refreshing
        // Only show warning if we haven't already
        setShowWarning(false);
      } else {
        setShowWarning(false);
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    checkExpiry();

    return () => clearInterval(interval);
  }, [session, isAuthenticated, isInitialized, loading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      const result = await safeRefreshSession();
      if (result.success) {
        setShowWarning(false);
        loginTimeRef.current = Date.now(); // Reset grace period
        toast.success('Session extended successfully');
      } else {
        toast.error('Failed to extend session. Please log in again.');
      }
    } catch (error) {
      toast.error('Failed to extend session');
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    setShowWarning(false);
    logout();
  };

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session will expire in{' '}
              <span className="font-semibold text-foreground">
                {formatTime(timeRemaining)}
              </span>
            </p>
            <p className="text-sm">
              Would you like to extend your session or log out?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExtendSession}
            disabled={isExtending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isExtending ? 'animate-spin' : ''}`} />
            {isExtending ? 'Extending...' : 'Extend Session'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionTimeoutWarning;
