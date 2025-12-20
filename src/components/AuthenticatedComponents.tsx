import { useAuth } from '@/contexts/AuthContext';
import RealtimeNotifications from './RealtimeNotifications';
import UploadFailureMonitor from './upload-history/UploadFailureMonitor';

/**
 * Components that require authentication context to be fully initialized.
 * These are rendered only after auth is ready to prevent "useAuth must be used within AuthProvider" errors.
 * 
 * Note: SessionTimeoutWarning was removed - Supabase handles token refresh automatically
 * via autoRefreshToken: true. Users stay logged in until they explicitly logout.
 */
const AuthenticatedComponents = () => {
  const { isInitialized, isAuthenticated } = useAuth();

  if (!isInitialized || !isAuthenticated) {
    return null;
  }

  return (
    <>
      <RealtimeNotifications />
      <UploadFailureMonitor />
    </>
  );
};

export default AuthenticatedComponents;
