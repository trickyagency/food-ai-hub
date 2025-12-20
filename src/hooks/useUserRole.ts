import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "owner" | "admin" | "manager" | "staff" | "viewer" | null;

export const useUserRole = () => {
  const { user, loading: authLoading, isInitialized } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Debounce - prevent duplicate fetches for same user
    if (fetchingRef.current && lastUserIdRef.current === user.id) {
      return;
    }

    // Trust AuthContext's user object - no need for redundant getSession() call
    // This prevents thundering herd of session checks across components

    fetchingRef.current = true;
    lastUserIdRef.current = user.id;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Failed to fetch user role:", error);
        setRole(null);
      } else if (!data) {
        // No role found - this might be a new user, set default viewer role
        console.log('No role found for user, defaulting to viewer');
        setRole('viewer');
      } else {
        setRole(data.role as UserRole);
      }
    } catch (error) {
      console.error("Failed to fetch user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    // Wait for auth to be fully initialized before fetching role
    if (!isInitialized || authLoading) {
      return;
    }

    // Reset if user changes
    if (user?.id !== lastUserIdRef.current) {
      setLoading(true);
      fetchRole();
    } else if (!user) {
      setRole(null);
      setLoading(false);
    }
  }, [user, isInitialized, authLoading, fetchRole]);

  const hasPermission = (requiredRoles: UserRole[]) => {
    return role && requiredRoles.includes(role);
  };

  // Permission helpers based on role hierarchy
  const canManageUsers = role === "owner"; // Add/delete users - Owner only
  const canAssignRoles = role === "owner" || role === "admin"; // Change roles - Owner + Admin
  const canManageFiles = role === "owner" || role === "admin";
  const canManageKnowledgeBase = role === "owner" || role === "admin";
  const canViewActivityLogs = role === "owner" || role === "admin";
  const canViewReports = role === "owner" || role === "admin" || role === "manager";
  const canMakeCalls = role === "owner" || role === "admin" || role === "manager";
  const canViewCallLogs = role === "owner" || role === "admin" || role === "manager" || role === "staff";
  const canViewDashboard = true; // All roles can view dashboard metrics
  const canViewCosts = role === "owner"; // Only owner can see cost information
  const isOwner = role === "owner";
  const isAdmin = role === "admin";

  return {
    role,
    loading: loading || authLoading || !isInitialized,
    hasPermission,
    canManageUsers,
    canAssignRoles,
    canManageFiles,
    canManageKnowledgeBase,
    canViewActivityLogs,
    canViewReports,
    canMakeCalls,
    canViewCallLogs,
    canViewDashboard,
    canViewCosts,
    isOwner,
    isAdmin,
  };
};
