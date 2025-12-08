import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  enroll2FA: () => Promise<{ success: boolean; data?: any; error?: string }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  unenroll2FA: () => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Log authentication events
        if (event === 'SIGNED_IN') {
          setTimeout(() => logAuditEvent('login', { method: 'email' }), 0);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => logAuditEvent('logout'), 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

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
        signup,
        logout,
        resetPassword,
        enroll2FA,
        verify2FA,
        unenroll2FA,
        isAuthenticated: !!user,
        loading,
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
