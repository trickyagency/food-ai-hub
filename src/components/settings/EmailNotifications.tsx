import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, Shield, UserCog, Mail } from "lucide-react";

interface NotificationPreferences {
  id?: string;
  user_id: string;
  role_changes: boolean;
  security_alerts: boolean;
  account_updates: boolean;
}

const EmailNotifications = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: "",
    role_changes: true,
    security_alerts: true,
    account_updates: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPreferences(data);
      } else {
        setPreferences({
          user_id: user.id,
          role_changes: true,
          security_alerts: true,
          account_updates: true,
        });
      }
    } catch (error: any) {
      toast.error("Failed to load preferences: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newPreferences = { ...preferences, [key]: value };

      if (preferences.id) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({ [key]: value, updated_at: new Date().toISOString() })
          .eq("id", preferences.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("notification_preferences")
          .insert([{
            user_id: user.id,
            role_changes: newPreferences.role_changes,
            security_alerts: newPreferences.security_alerts,
            account_updates: newPreferences.account_updates,
          }])
          .select()
          .single();

        if (error) throw error;
        setPreferences({ ...newPreferences, id: data.id });
      }

      setPreferences(newPreferences);
      toast.success("Notification preference updated");
    } catch (error: any) {
      toast.error("Failed to update preference: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Control which events trigger email notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">Loading preferences...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Choose which events you want to be notified about via email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start gap-3 flex-1">
            <Shield className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="space-y-1">
              <Label htmlFor="security-alerts" className="text-base cursor-pointer">
                Security Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified about password changes, 2FA modifications, and suspicious activity
              </p>
            </div>
          </div>
          <Switch
            id="security-alerts"
            checked={preferences.security_alerts}
            onCheckedChange={(checked) => updatePreference("security_alerts", checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start gap-3 flex-1">
            <UserCog className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="space-y-1">
              <Label htmlFor="role-changes" className="text-base cursor-pointer">
                Role Changes
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications when your role or permissions are updated by an admin
              </p>
            </div>
          </div>
          <Switch
            id="role-changes"
            checked={preferences.role_changes}
            onCheckedChange={(checked) => updatePreference("role_changes", checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start gap-3 flex-1">
            <Mail className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="space-y-1">
              <Label htmlFor="account-updates" className="text-base cursor-pointer">
                Account Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Important updates about your account, profile changes, and system notifications
              </p>
            </div>
          </div>
          <Switch
            id="account-updates"
            checked={preferences.account_updates}
            onCheckedChange={(checked) => updatePreference("account_updates", checked)}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailNotifications;
