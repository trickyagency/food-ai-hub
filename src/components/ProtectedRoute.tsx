import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect AFTER auth is fully initialized and not loading
    if (isInitialized && !loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, loading, isInitialized, navigate]);

  // Show loading spinner while auth is initializing
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
