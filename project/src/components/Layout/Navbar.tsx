import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsService } from '../../services/database';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { userPreferences } = useSettings();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load unread notification count
    const loadUnreadCount = async () => {
      if (user) {
        try {
          const count = await notificationsService.getUnreadCount(user.id);
          setUnreadCount(count);
        } catch (error) {
          console.error('Error loading unread count:', error);
        }
      }
    };

    loadUnreadCount();

    // Set up real-time subscription for notifications
    if (user) {
      const subscription = notificationsService.subscribeToUserNotifications(user.id, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        if (eventType === 'INSERT' && !newRecord.is_read) {
          setUnreadCount(prev => prev + 1);
        } else if (eventType === 'UPDATE' && oldRecord.is_read !== newRecord.is_read) {
          if (newRecord.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          } else {
            setUnreadCount(prev => prev + 1);
          }
        } else if (eventType === 'DELETE' && !oldRecord.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigateToSettings = () => {
    setShowSettings(false);
    navigate('/settings');
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Mortuary System</h1>
            {user && (
              <div className="text-sm text-gray-500">
                {user.role === 'admin' && 'Administration Panel'}
                {user.role === 'staff' && 'Staff Dashboard'}
                {user.role === 'pathologist' && 'Pathologist Dashboard'}
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              {/* Role Display */}
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
                <label className="text-sm font-medium text-gray-700">Role:</label>
                <span className="text-sm text-blue-600 font-medium capitalize">
                  {user.role}
                </span>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={handleNotificationClick}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <button 
                      onClick={handleSettingsClick}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    
                    {/* Settings Dropdown */}
                    {showSettings && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          <button
                            onClick={handleNavigateToSettings}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Settings
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;