import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = 'login' | 'reset' | 'setup';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const { login, resetPassword, completeAccountSetup, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Check for invite/recovery tokens in URL
  useEffect(() => {
    const checkForTokens = async () => {
      // Check URL hash for tokens (Supabase uses hash fragments)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const tokenType = hashParams.get('type');
      const urlMode = searchParams.get('mode');

      // If there's an access token with invite or recovery type, switch to setup mode
      if (accessToken && (tokenType === 'invite' || tokenType === 'recovery' || tokenType === 'magiclink')) {
        setMode('setup');
      } else if (urlMode === 'reset') {
        // Check if user already has a session (from clicking reset link)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setMode('setup');
        }
      }
      
      setIsCheckingToken(false);
    };

    checkForTokens();

    // Listen for auth state changes (when Supabase processes the token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        // User clicked invite/recovery link - show setup form
        if (session && mode !== 'setup') {
          setMode('setup');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  // Redirect authenticated users (but not during setup)
  useEffect(() => {
    if (isAuthenticated && mode !== 'setup' && !isCheckingToken) {
      navigate("/");
    }
  }, [isAuthenticated, mode, isCheckingToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'reset') {
        const result = await resetPassword(email);
        if (result.success) {
          toast.success("Password reset email sent! Check your inbox.");
          setMode('login');
        } else {
          toast.error(result.error || "An error occurred");
        }
      } else if (mode === 'setup') {
        // Validate passwords match
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setIsLoading(false);
          return;
        }

        if (!fullName.trim()) {
          toast.error("Please enter your full name");
          setIsLoading(false);
          return;
        }

        const result = await completeAccountSetup(password, fullName.trim());
        
        if (result.success) {
          toast.success("Account setup complete! Welcome aboard.");
          navigate("/");
        } else {
          toast.error(result.error || "An error occurred");
        }
      } else {
        const result = await login(email, password);
        
        if (result.success) {
          toast.success("Logged in successfully!");
          navigate("/");
        } else {
          toast.error(result.error || "An error occurred");
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }


  const getTitle = () => {
    switch (mode) {
      case 'setup': return "Complete Your Account";
      case 'reset': return "Reset Password";
      default: return "Welcome back";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'setup': return "Set your password and name to get started";
      case 'reset': return "Enter your email to receive a password reset link";
      default: return "Sign in to VOICE AI Smartflow Automation";
    }
  };

  const getButtonText = () => {
    if (isLoading) return "Loading...";
    switch (mode) {
      case 'setup': return "Complete Setup";
      case 'reset': return "Send Reset Link";
      default: return "Sign In";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
          {mode === 'setup' && user?.email && (
            <p className="text-sm text-muted-foreground">
              Setting up account for: <span className="font-medium">{user.email}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field - only for login and reset modes */}
            {mode !== 'setup' && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Full Name field - only for setup mode */}
            {mode === 'setup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            )}
            
            {/* Password field - for login and setup modes */}
            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {mode === 'setup' ? 'New Password' : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            )}

            {/* Confirm Password field - only for setup mode */}
            {mode === 'setup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {getButtonText()}
            </Button>
          </form>

          {/* Footer links - only for login and reset modes */}
          {mode !== 'setup' && (
            <div className="mt-4 text-center space-y-2">
              {mode === 'login' && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setMode('reset')}
                  disabled={isLoading}
                >
                  Forgot your password?
                </Button>
              )}
              
              {mode === 'reset' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('login')}
                  disabled={isLoading}
                >
                  Back to sign in
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
