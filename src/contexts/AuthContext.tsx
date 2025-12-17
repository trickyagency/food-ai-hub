import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  const logAuditEvent = async (eventType: string, eventDetails?: any) => {
    try {
      await supabase.from('audit_logs').insert({
        event_type: eventType,
        event_details: eventDetails,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  };

  useEffect(() => {
    let initialAuthDone = false;

    // Set up auth state listener - MUST be synchronous per Supabase best practices
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        // Only update state after initial auth is done to avoid race conditions
        if (initialAuthDone) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          // If signed out, clear loading
          if (event === 'SIGNED_OUT') {
            setLoading(false);
          }
        }
        
        // Log authentication events - defer to avoid deadlock
        if (event === 'SIGNED_IN') {
          setTimeout(() => logAuditEvent('login', { method: 'email' }), 0);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => logAuditEvent('logout'), 0);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
          // Update session with new token
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
          }
        }
      }
    );

    // Check for existing session and refresh if needed
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          // Clear invalid session
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          return;
        }
        
        if (!session) {
          setSession(null);
          setUser(null);
          return;
        }

        // Check if token is already expired or about to expire
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
        
        console.log('Token expires in:', timeUntilExpiry, 'seconds');
        
        if (timeUntilExpiry <= 0) {
          // Token already expired, try to refresh
          console.log('Token expired, attempting refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            console.error('Failed to refresh expired session:', refreshError);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            console.log('Session refreshed successfully');
            setSession(refreshData.session);
            setUser(refreshData.session?.user ?? null);
          }
        } else if (timeUntilExpiry < 300) {
          // Token expires in less than 5 minutes, proactively refresh
          console.log('Token expiring soon, proactively refreshing...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            // Use existing session if refresh fails
            setSession(session);
            setUser(session?.user ?? null);
          } else if (refreshData.session) {
            console.log('Session proactively refreshed');
            setSession(refreshData.session);
            setUser(refreshData.session?.user ?? null);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initSession().then(() => {
      initialAuthDone = true;
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to manually refresh session with debouncing (useful for retry on 401)
  const refreshSession = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      console.log('Session refresh already in progress, skipping...');
      return false;
    }
    
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        console.error('Manual session refresh failed:', error);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
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
  }, [isRefreshing]);

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
        setSession(data.session);
        setUser(data.session.user);
      }

      // Small delay to let React state propagate before navigation
      await new Promise(resolve => setTimeout(resolve, 150));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };


  const logout = async () => {
    await logAuditEvent('logout');
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

      await logAuditEvent('password_reset_requested', { email });
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

      await logAuditEvent('account_setup_completed', { email: user.email });
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

      await logAuditEvent('2fa_enrollment_started');
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

      await logAuditEvent('2fa_verified');
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

      await logAuditEvent('2fa_unenrolled');
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
