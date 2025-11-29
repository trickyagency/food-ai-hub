import { supabase } from "@/integrations/supabase/client";

interface AuditLogEvent {
  event_type: string;
  event_details?: any;
  user_id?: string;
}

export const createAuditLog = async ({
  event_type,
  event_details,
  user_id,
}: AuditLogEvent) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("audit_logs").insert([
      {
        user_id: user_id || user?.id,
        event_type,
        event_details,
        ip_address: null, // Could be populated from request headers
        user_agent: navigator.userAgent,
      },
    ]);

    if (error) {
      console.error("Failed to create audit log:", error);
    }
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};

// Convenience functions for common events
export const auditLog = {
  login: (userId: string) =>
    createAuditLog({
      event_type: "login",
      user_id: userId,
    }),

  logout: (userId: string) =>
    createAuditLog({
      event_type: "logout",
      user_id: userId,
    }),

  passwordChange: (userId: string) =>
    createAuditLog({
      event_type: "password_change",
      user_id: userId,
      event_details: { changed_at: new Date().toISOString() },
    }),

  roleChange: (userId: string, oldRole: string, newRole: string, changedBy?: string, changedByEmail?: string) =>
    createAuditLog({
      event_type: "role_change",
      user_id: userId,
      event_details: { 
        old_role: oldRole, 
        new_role: newRole,
        changed_by: changedBy,
        changed_by_email: changedByEmail,
        timestamp: new Date().toISOString()
      },
    }),

  twoFactorEnabled: (userId: string) =>
    createAuditLog({
      event_type: "2fa_enabled",
      user_id: userId,
    }),

  twoFactorDisabled: (userId: string) =>
    createAuditLog({
      event_type: "2fa_disabled",
      user_id: userId,
    }),

  userCreated: (userId: string, email: string) =>
    createAuditLog({
      event_type: "user_created",
      user_id: userId,
      event_details: { email },
    }),

  userDeleted: (userId: string, email: string) =>
    createAuditLog({
      event_type: "user_deleted",
      event_details: { deleted_user_id: userId, email },
    }),

  profileUpdated: (userId: string) =>
    createAuditLog({
      event_type: "profile_updated",
      user_id: userId,
    }),

  fileDeleted: (fileName: string, fileId: string) =>
    createAuditLog({
      event_type: "file_deleted",
      event_details: { file_name: fileName, file_id: fileId },
    }),
};
