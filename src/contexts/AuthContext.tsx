import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * WARNING: This is a DEMO authentication implementation using localStorage.
 * This is NOT secure for production use. Anyone can bypass this by editing
 * browser storage. For production, use proper backend authentication.
 */

interface User {
  email: string;
  id: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('demo_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const signup = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Basic validation
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('demo_users') || '{}');
    if (users[email]) {
      return { success: false, error: 'User already exists' };
    }

    // Store user credentials (WARNING: This is NOT secure!)
    users[email] = { password, id: crypto.randomUUID() };
    localStorage.setItem('demo_users', JSON.stringify(users));

    // Auto login after signup
    const newUser = { email, id: users[email].id };
    setUser(newUser);
    localStorage.setItem('demo_user', JSON.stringify(newUser));

    return { success: true };
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Basic validation
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Check credentials
    const users = JSON.parse(localStorage.getItem('demo_users') || '{}');
    if (!users[email]) {
      return { success: false, error: 'Invalid email or password' };
    }
    if (users[email].password !== password) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Set user as logged in
    const loggedInUser = { email, id: users[email].id };
    setUser(loggedInUser);
    localStorage.setItem('demo_user', JSON.stringify(loggedInUser));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('demo_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
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
