import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { safeRefreshSession, setLoginGracePeriod } from '@/lib/sessionManager';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  completeAccountSetup: (password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  enroll2FA: () => Promise<{ success: boolean; data?: any; error?: string }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  unenroll2FA: () => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  loading: boolean;
  isInitialized: boolean;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // Silent audit logging that includes user_id and never throws
  const logAuditEvent = async (eventType: string, userId?: string, eventDetails?: any) => {
    try {
      // Silently skip if no user_id provided (prevents RLS errors)
      if (!userId) {
        console.log('Audit event skipped (no user_id):', eventType);
        return;
      }
      await supabase.from('audit_logs').insert({
        event_type: eventType,
        event_details: eventDetails,
        user_id: userId,
      });
    } catch (error) {
      // Always fail silently - never disrupt auth flow
      console.warn('Audit log failed (non-critical):', eventType, error);
    }
  };

  useEffect(() => {
    // Track if we've set initialized (only do it once from getSession)
    let hasInitialized = false;

    // IMPORTANT: listener first, then getSession (Supabase best practice)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);

      // Keep this callback synchronous (no awaits) to avoid deadlocks.
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Don't set isInitialized here - let getSession handle it to avoid race conditions

      // Note: Login audit is handled in login() function to avoid spam on session refresh
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });

    // Then read existing session - this is the source of truth for initialization
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Session error:', error);
          setSession(null);
          setUser(null);
          return;
        }

        console.log('Initial session loaded:', session?.user?.id ?? 'no session');
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('Auth initialization error:', err);
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        // Only set initialized once, from getSession (not from onAuthStateChange)
        if (!hasInitialized) {
          hasInitialized = true;
          setIsInitialized(true);
          setLoading(false);
          console.log('Auth fully initialized');
        }
      });

    return () => subscription.unsubscribe();
  }, []);

  // Function to manually refresh session with strict cooldown (useful for retry on 401)
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    const COOLDOWN_MS = 120000; // 2 minutes cooldown
    
    // Prevent refresh if within cooldown period
    if (now - lastRefreshTime < COOLDOWN_MS) {
      console.log('Session refresh on cooldown, skipping...');
      return !!session; // Return current session validity
    }
    
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      console.log('Session refresh already in progress, skipping...');
      return !!session;
    }
    
    setIsRefreshing(true);
    setLastRefreshTime(now);
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        console.error('Manual session refresh failed:', error);
        // Don't sign out on refresh failure - let user continue with current session
        return false;
      }
      setSession(data.session);
      setUser(data.session.user);
      return true;
    } catch (err) {
      console.error('Error refreshing session:', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, lastRefreshTime, session]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Immediately set session state to prevent race conditions
      if (data.session) {
        // Activate grace period BEFORE setting state to prevent refresh storms
        setLoginGracePeriod();
        
        setSession(data.session);
        setUser(data.session.user);
        
        // Log audit event only on actual login (not session refresh)
        logAuditEvent('login', data.session.user.id, { method: 'email' });
      }

      // Small delay to let React state propagate before navigation
      await new Promise(resolve => setTimeout(resolve, 150));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };


  const logout = async () => {
    const userId = user?.id;
    if (userId) {
      await logAuditEvent('logout', userId);
    }
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await logAuditEvent('password_reset_requested', user?.id, { email });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Password reset failed' };
    }
  };

  const completeAccountSetup = async (password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'No user session found' };
      }

      // Update password and user metadata
      const { error: authError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName }
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      // Update profiles table with full name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        // Don't fail the whole operation if profile update fails
      }

      await logAuditEvent('account_setup_completed', user.id, { email: user.email });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Account setup failed' };
    }
  };

  const enroll2FA = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await logAuditEvent('2fa_enrollment_started', user?.id);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || '2FA enrollment failed' };
    }
  };

  const verify2FA = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (!factors.data?.totp || factors.data.totp.length === 0) {
        return { success: false, error: 'No 2FA factor found' };
      }

      const factorId = factors.data.totp[0].id;
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await logAuditEvent('2fa_verified', user?.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '2FA verification failed' };
    }
  };

  const unenroll2FA = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (!factors.data?.totp || factors.data.totp.length === 0) {
        return { success: false, error: 'No 2FA factor found' };
      }

      const factorId = factors.data.totp[0].id;
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) {
        return { success: false, error: error.message };
      }

      await logAuditEvent('2fa_unenrolled', user?.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '2FA unenrollment failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        logout,
        resetPassword,
        completeAccountSetup,
        enroll2FA,
        verify2FA,
        unenroll2FA,
        isAuthenticated: !!user,
        loading,
        isInitialized,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
