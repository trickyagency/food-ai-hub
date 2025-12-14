import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Auth = () => {
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, resetPassword, isAuthenticated } = useAuth();
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


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isResetPassword ? "Reset Password" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isResetPassword 
              ? "Enter your email to receive a password reset link"
              : "Sign in to VOICE AI Smartflow Automation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          
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
              {isLoading ? "Loading..." : (isResetPassword ? "Send Reset Link" : "Sign In")}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {!isResetPassword && (
              <Button
                type="button"
                variant="link"
                onClick={() => setIsResetPassword(true)}
                disabled={isLoading}
              >
                Forgot your password?
              </Button>
            )}
            
            {isResetPassword && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsResetPassword(false)}
                disabled={isLoading}
              >
                Back to sign in
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
