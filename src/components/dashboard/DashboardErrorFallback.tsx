import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface DashboardErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
}

export const DashboardErrorFallback = ({ error, onRetry }: DashboardErrorFallbackProps) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const isAuthError = error?.message?.toLowerCase().includes('auth') ||
    error?.message?.toLowerCase().includes('session') ||
    error?.message?.toLowerCase().includes('jwt');

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          
          <h2 className="text-xl font-semibold mb-2">
            {isAuthError ? 'Session Expired' : 'Dashboard Failed to Load'}
          </h2>
          
          <p className="text-muted-foreground mb-6 text-sm">
            {isAuthError
              ? 'Your session has expired. Please log in again to continue.'
              : error?.message || 'We encountered an issue while loading your dashboard. Please try again.'}
          </p>

          <div className="flex gap-3">
            {isAuthError ? (
              <Button onClick={() => navigate('/auth')} variant="default">
                <Home className="mr-2 h-4 w-4" />
                Go to Login
              </Button>
            ) : (
              <>
                <Button onClick={handleRetry} variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button onClick={() => navigate('/auth')} variant="outline">
                  Back to Login
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
