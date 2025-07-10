import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsService } from '../services/missingServices';
import { useAuth } from './AuthContext';

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'english' | 'spanish' | 'french';
  timezone: string;
  auto_logout: number;
  notifications: {
    email: boolean;
    sms: boolean;
    login_alerts: boolean;
    task_reminders: boolean;
    storage_alerts: boolean;
    system_updates: boolean;
  };
}

interface AccountSettings {
  two_factor_enabled: boolean;
  two_factor_method: 'email' | 'sms';
  email_notifications: boolean;
  sms_notifications: boolean;
  login_alerts: boolean;
  notification_email: string;
  notification_phone: string;
}

interface LoginHistoryEntry {
  id: string;
  user_id: string;
  login_time: string;
  ip_address: string;
  user_agent: string;
  location: string;
  success: boolean;
}

interface SettingsContextType {
  // User Preferences
  userPreferences: UserPreferences;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  applyTheme: (theme: 'light' | 'dark' | 'auto') => void;
  applyLanguage: (language: string) => void;
  applyTimezone: (timezone: string) => void;
  setAutoLogout: (minutes: number) => void;
  
  // Account Settings
  accountSettings: AccountSettings;
  updateAccountSettings: (settings: Partial<AccountSettings>) => Promise<void>;
  toggleTwoFactor: (enabled: boolean, method?: 'email' | 'sms') => Promise<void>;
  updateNotificationSettings: (settings: Partial<AccountSettings>) => Promise<void>;
  
  // Login History
  loginHistory: LoginHistoryEntry[];
  loadLoginHistory: () => Promise<void>;
  
  // Password Management
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // System Settings
  systemSettings: any;
  updateSystemSettings: (settings: any) => Promise<void>;
  
  // Loading States
  isLoading: boolean;
  isSaving: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    theme: 'light',
    language: 'english',
    timezone: 'UTC+0',
    auto_logout: 30,
    notifications: {
      email: true,
      sms: false,
      login_alerts: true,
      task_reminders: true,
      storage_alerts: true,
      system_updates: true
    }
  });
  
  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    two_factor_enabled: false,
    two_factor_method: 'email',
    email_notifications: true,
    sms_notifications: false,
    login_alerts: true,
    notification_email: 'kamaralamin1997@gmail.com',
    notification_phone: '+23278786633'
  });
  
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount and when user changes
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  // Apply theme changes to document
  useEffect(() => {
    applyThemeToDocument(userPreferences.theme);
  }, [userPreferences.theme]);

  // Set up auto-logout timer
  useEffect(() => {
    if (userPreferences.auto_logout > 0) {
      const timer = setTimeout(() => {
        // Auto logout after specified minutes of inactivity
        const handleActivity = () => {
          clearTimeout(timer);
          // Reset timer on any activity
          setTimeout(() => {
            // Logout user
            window.location.href = '/login';
          }, userPreferences.auto_logout * 60 * 1000);
        };

        // Listen for user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
          document.addEventListener(event, handleActivity, true);
        });

        return () => {
          events.forEach(event => {
            document.removeEventListener(event, handleActivity, true);
          });
        };
      }, userPreferences.auto_logout * 60 * 1000);

      return () => clearTimeout(timer);
    }
  }, [userPreferences.auto_logout, user]);

  const loadSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load user preferences
      const preferences = await settingsService.getUserPreferences(user.id);
      setUserPreferences(preferences);
      
      // Load account settings
      const account = await settingsService.getAccountSettings(user.id);
      setAccountSettings(account);
      
      // Load system settings
      const system = await settingsService.getSystemSettings();
      setSystemSettings(system);
      
      // Load login history
      await loadLoginHistory();
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLoginHistory = async () => {
    if (!user) return;
    
    try {
      const history = await settingsService.getLoginHistory(user.id);
      setLoginHistory(history);
    } catch (error) {
      console.error('Error loading login history:', error);
    }
  };

  const updateUserPreferences = async (preferences: Partial<UserPreferences>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const updatedPreferences = { ...userPreferences, ...preferences };
      await settingsService.updateUserPreferences(user.id, updatedPreferences);
      setUserPreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateAccountSettings = async (settings: Partial<AccountSettings>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const updatedSettings = { ...accountSettings, ...settings };
      await settingsService.updateAccountSettings(user.id, updatedSettings);
      setAccountSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating account settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateSystemSettings = async (settings: any) => {
    setIsSaving(true);
    try {
      const updatedSettings = { ...systemSettings, ...settings };
      await settingsService.updateSystemSettings(updatedSettings);
      setSystemSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    updateUserPreferences({ theme });
  };

  const applyLanguage = (language: string) => {
    updateUserPreferences({ language: language as 'english' | 'spanish' | 'french' });
  };

  const applyTimezone = (timezone: string) => {
    updateUserPreferences({ timezone });
  };

  const setAutoLogout = (minutes: number) => {
    updateUserPreferences({ auto_logout: minutes });
  };

  const toggleTwoFactor = async (enabled: boolean, method: 'email' | 'sms' = 'email') => {
    if (!user) return;
    
    try {
      if (enabled) {
        await settingsService.enableTwoFactor(user.id, method);
        setAccountSettings(prev => ({
          ...prev,
          two_factor_enabled: true,
          two_factor_method: method
        }));
      } else {
        await settingsService.disableTwoFactor(user.id);
        setAccountSettings(prev => ({
          ...prev,
          two_factor_enabled: false
        }));
      }
    } catch (error) {
      console.error('Error toggling two-factor authentication:', error);
      throw error;
    }
  };

  const updateNotificationSettings = async (settings: Partial<AccountSettings>) => {
    await updateAccountSettings(settings);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) return;
    
    try {
      await settingsService.changePassword(user.id, currentPassword, newPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  const applyThemeToDocument = (theme: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    
    // Store theme preference
    localStorage.setItem('theme', theme);
  };

  const value: SettingsContextType = {
    userPreferences,
    updateUserPreferences,
    applyTheme,
    applyLanguage,
    applyTimezone,
    setAutoLogout,
    accountSettings,
    updateAccountSettings,
    toggleTwoFactor,
    updateNotificationSettings,
    loginHistory,
    loadLoginHistory,
    changePassword,
    systemSettings,
    updateSystemSettings,
    isLoading,
    isSaving
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}; 