import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Key, UserPlus, UserMinus, UserCog } from "lucide-react";

interface NotificationPreferences {
  role_changes: boolean;
  security_alerts: boolean;
  account_updates: boolean;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  event_type: string;
  event_details: any;
  created_at: string;
}

const RealtimeNotifications = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    role_changes: true,
    security_alerts: true,
    account_updates: true,
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPreferences({
          role_changes: data.role_changes,
          security_alerts: data.security_alerts,
          account_updates: data.account_updates,
        });
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("audit-logs-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
        },
        (payload) => {
          const newLog = payload.new as AuditLog;
          handleNewAuditLog(newLog);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, preferences]);

  const handleNewAuditLog = (log: AuditLog) => {
    // Only show notifications for the current user's events
    if (log.user_id !== currentUserId) return;

    const eventType = log.event_type.toLowerCase();

    // Security alerts
    if (preferences.security_alerts) {
      if (eventType.includes("password")) {
        toast.warning("Security Alert", {
          description: "Your password was changed",
          icon: <Key className="h-5 w-5" />,
          duration: 5000,
        });
        return;
      }

      if (eventType.includes("2fa") || eventType.includes("mfa")) {
        toast.warning("Security Alert", {
          description: "Two-factor authentication settings were modified",
          icon: <Shield className="h-5 w-5" />,
          duration: 5000,
        });
        return;
      }

      if (eventType.includes("login") || eventType.includes("signin")) {
        toast.info("Security Notice", {
          description: "New login detected on your account",
          icon: <UserCog className="h-5 w-5" />,
          duration: 4000,
        });
        return;
      }
    }

    // Role changes
    if (preferences.role_changes) {
      if (eventType.includes("role")) {
        const details = log.event_details;
        const newRole = details?.new_role || "updated";
        const oldRole = details?.old_role;
        const changedByEmail = details?.changed_by_email;
        
        // Get role description
        const roleDescriptions: Record<string, string> = {
          owner: "Full system access and user management",
          admin: "Manage users, view all data, and access settings",
          manager: "View reports and manage staff operations",
          staff: "Standard access to daily operations",
          viewer: "Read-only access to information"
        };
        
        const description = changedByEmail 
          ? `${changedByEmail} changed your role from ${oldRole} to ${newRole}. ${roleDescriptions[newRole] || ""}`
          : `Your role has been changed to ${newRole}. ${roleDescriptions[newRole] || ""}`;
        
        toast.success("Role Updated", {
          description,
          icon: <UserCog className="h-5 w-5" />,
          duration: 7000,
        });
        return;
      }
    }

    // Account updates
    if (preferences.account_updates) {
      if (eventType.includes("created")) {
        toast.success("Welcome!", {
          description: "Your account has been created",
          icon: <UserPlus className="h-5 w-5" />,
          duration: 4000,
        });
        return;
      }

      if (eventType.includes("updated") || eventType.includes("profile")) {
        toast.info("Account Updated", {
          description: "Your account information was updated",
          icon: <UserCog className="h-5 w-5" />,
          duration: 3000,
        });
        return;
      }
    }
  };

  // This component doesn't render anything
  return null;
};

export default RealtimeNotifications;
