import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Chrome } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup, signInWithGoogle, resetPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isResetPassword) {
        const result = await resetPassword(email);
        if (result.success) {
          toast.success("Password reset email sent! Check your inbox.");
          setIsResetPassword(false);
        } else {
          toast.error(result.error || "An error occurred");
        }
      } else {
        const result = isLogin ? await login(email, password) : await signup(email, password);
        
        if (result.success) {
          toast.success(isLogin ? "Logged in successfully!" : "Account created! Check your email to verify.");
          if (isLogin) {
            navigate("/");
          }
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

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error("Google sign-in failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isResetPassword ? "Reset Password" : (isLogin ? "Welcome back" : "Create an account")}
          </CardTitle>
          <CardDescription>
            {isResetPassword 
              ? "Enter your email to receive a password reset link"
              : (isLogin 
                  ? "Sign in to VOICE AI Smartflow Automation" 
                  : "Sign up to get started with VOICE AI Smartflow Automation")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isResetPassword && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Chrome className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
            
            {!isResetPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : (isResetPassword ? "Send Reset Link" : (isLogin ? "Sign In" : "Sign Up"))}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {!isResetPassword && isLogin && (
              <Button
                type="button"
                variant="link"
                onClick={() => setIsResetPassword(true)}
                disabled={isLoading}
              >
                Forgot your password?
              </Button>
            )}
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsResetPassword(false);
                setIsLogin(!isLogin);
              }}
              disabled={isLoading}
            >
              {isResetPassword 
                ? "Back to sign in" 
                : (isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
