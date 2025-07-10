import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { usersService, authService, settingsService } from '../services/database';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'pathologist';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Demo users for role-based authentication
  const demoUsers = {
    admin: {
      id: 'admin-1',
      name: 'System Administrator',
      email: 'admin@mortuary.com',
      role: 'admin' as const
    },
    staff: {
      id: 'staff-1',
      name: 'John Smith',
      email: 'staff@mortuary.com',
      role: 'staff' as const
    },
    pathologist: {
      id: 'pathologist-1',
      name: 'Dr. Sarah Johnson',
      email: 'pathologist@mortuary.com',
      role: 'pathologist' as const
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Try to get user from database
          try {
            const userData = await usersService.getById(session.user.id);
            setUser({
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role
            });
          } catch (error) {
            // If user not found in database, use demo user
            const storedUser = localStorage.getItem('demoUser');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          }
        } else {
          // Check for demo user in localStorage
          const storedUser = localStorage.getItem('demoUser');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const userData = await usersService.getById(session.user.id);
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role
          });
        } catch (error) {
          console.error('Failed to get user data:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        const storedUser = localStorage.getItem('demoUser');
        if (!storedUser) {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      // Check if it's a demo login
      const demoUser = Object.values(demoUsers).find(u => u.email === email);
      const demoPasswords = {
        'admin@mortuary.com': 'admin123',
        'staff@mortuary.com': 'staff123',
        'pathologist@mortuary.com': 'pathologist123'
      };

      if (demoUser && demoPasswords[email as keyof typeof demoPasswords] === password) {
        // Demo login
        setUser(demoUser);
        localStorage.setItem('demoUser', JSON.stringify(demoUser));
        
        // Record login history for demo user
        try {
          await settingsService.addLoginRecord(demoUser.id, {
            ip_address: 'Demo Login',
            user_agent: navigator.userAgent,
            location: 'Demo Environment',
            success: true
          });
        } catch (error) {
          console.error('Failed to record login history:', error);
        }
        
        return;
      }

      // Try Supabase authentication
      const { user: authUser } = await authService.signIn(email, password);
      
      if (authUser) {
        const userData = await usersService.getById(authUser.id);
        const user = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        };
        setUser(user);
        localStorage.removeItem('demoUser');
        
        // Record login history
        try {
          await settingsService.addLoginRecord(user.id, {
            ip_address: 'Real Login',
            user_agent: navigator.userAgent,
            location: 'Production Environment',
            success: true
          });
        } catch (error) {
          console.error('Failed to record login history:', error);
        }
      }
    } catch (error: any) {
      // Record failed login attempt
      try {
        const demoUser = Object.values(demoUsers).find(u => u.email === email);
        if (demoUser) {
          await settingsService.addLoginRecord(demoUser.id, {
            ip_address: 'Failed Login',
            user_agent: navigator.userAgent,
            location: 'Unknown',
            success: false
          });
        }
      } catch (historyError) {
        console.error('Failed to record failed login:', historyError);
      }
      
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('demoUser');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};