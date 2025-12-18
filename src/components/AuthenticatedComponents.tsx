import { useAuth } from '@/contexts/AuthContext';
import SessionTimeoutWarning from './SessionTimeoutWarning';
import RealtimeNotifications from './RealtimeNotifications';
import UploadFailureMonitor from './upload-history/UploadFailureMonitor';

/**
 * Components that require authentication context to be fully initialized.
 * These are rendered only after auth is ready to prevent "useAuth must be used within AuthProvider" errors.
 */
const AuthenticatedComponents = () => {
  const { isInitialized, isAuthenticated } = useAuth();

  // Don't render until auth is fully initialized
  if (!isInitialized) {
    return null;
  }

  // Only render auth-dependent components when user is authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <SessionTimeoutWarning />
      <RealtimeNotifications />
      <UploadFailureMonitor />
    </>
  );
};

export default AuthenticatedComponents;
