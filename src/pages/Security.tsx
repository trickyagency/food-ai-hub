import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, QrCode } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Security = () => {
  const { enroll2FA, verify2FA, unenroll2FA } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const factors = await supabase.auth.mfa.listFactors();
      setIs2FAEnabled(factors.data?.totp && factors.data.totp.length > 0);
    } catch (error) {
      console.error("Failed to check MFA status:", error);
    }
  };

  const handleEnroll2FA = async () => {
    setIsEnrolling(true);
    try {
      const result = await enroll2FA();
      if (result.success && result.data) {
        setQrCode(result.data.totp.qr_code);
        setSecret(result.data.totp.secret);
        setShowEnrollment(true);
        toast.success("Scan the QR code with your authenticator app");
      } else {
        toast.error(result.error || "Failed to enroll 2FA");
      }
    } catch (error) {
      toast.error("An error occurred during 2FA enrollment");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verify2FA(verificationCode);
      if (result.success) {
        toast.success("2FA enabled successfully!");
        setIs2FAEnabled(true);
        setShowEnrollment(false);
        setVerificationCode("");
        setQrCode("");
        setSecret("");
      } else {
        toast.error(result.error || "Failed to verify 2FA");
      }
    } catch (error) {
      toast.error("An error occurred during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnenroll2FA = async () => {
    try {
      const result = await unenroll2FA();
      if (result.success) {
        toast.success("2FA disabled successfully");
        setIs2FAEnabled(false);
      } else {
        toast.error(result.error || "Failed to disable 2FA");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Security Settings</h1>
          <p className="text-muted-foreground">Manage your account security and two-factor authentication</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Two-Factor Authentication (2FA)
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
              {is2FAEnabled && (
                <Button variant="destructive" onClick={handleUnenroll2FA}>
                  Disable 2FA
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!is2FAEnabled && !showEnrollment && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication is not enabled on your account. Enable it to add an extra layer of security.
                </p>
                <Button onClick={handleEnroll2FA} disabled={isEnrolling}>
                  <QrCode className="mr-2 h-4 w-4" />
                  {isEnrolling ? "Setting up..." : "Enable 2FA"}
                </Button>
              </div>
            )}

            {showEnrollment && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-semibold mb-2">Step 1: Scan QR Code</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                    {qrCode && (
                      <div className="flex justify-center">
                        <img src={qrCode} alt="2FA QR Code" className="border rounded" />
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-semibold mb-2">Step 2: Enter Secret Key (Alternative)</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      If you can't scan the QR code, enter this secret key manually:
                    </p>
                    <code className="block bg-muted p-2 rounded text-sm font-mono break-all">
                      {secret}
                    </code>
                  </div>

                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-semibold mb-4">Step 3: Verify Code</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Verification Code</Label>
                        <Input
                          id="code"
                          type="text"
                          placeholder="000000"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          disabled={isVerifying}
                          maxLength={6}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleVerify2FA} disabled={isVerifying}>
                          {isVerifying ? "Verifying..." : "Verify and Enable"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowEnrollment(false);
                            setQrCode("");
                            setSecret("");
                            setVerificationCode("");
                          }}
                          disabled={isVerifying}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {is2FAEnabled && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Shield className="h-4 w-4" />
                <span>Two-factor authentication is enabled on your account</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Security;
