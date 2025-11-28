import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "owner" | "admin" | "manager" | "staff" | "viewer" | null;

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        setRole(data?.role as UserRole || null);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const hasPermission = (requiredRoles: UserRole[]) => {
    return role && requiredRoles.includes(role);
  };

  const canManageUsers = role === "owner" || role === "admin";
  const canViewReports = role === "owner" || role === "admin" || role === "manager";
  const isOwner = role === "owner";
  const isAdmin = role === "admin";

  return {
    role,
    loading,
    hasPermission,
    canManageUsers,
    canViewReports,
    isOwner,
    isAdmin,
  };
};
