import React, { useState } from 'react';
import { Settings, Palette, Globe, Clock } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import NotificationToast from '../Layout/NotificationToast';

const SettingsManagement: React.FC = () => {
  const {
    userPreferences,
    updateUserPreferences,
    isLoading,
    isSaving
  } = useSettings();

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, type, isVisible: true });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const handleSystemPreferencesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserPreferences({
        theme: userPreferences.theme,
        language: userPreferences.language,
        auto_logout: userPreferences.auto_logout
      });
      showNotification('System preferences updated successfully!', 'success');
    } catch (error) {
      showNotification('Failed to update system preferences', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your system preferences
            </p>
          </div>

          {/* System Preferences Only */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">System Preferences</h2>
            <form onSubmit={handleSystemPreferencesSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4 inline mr-2" />
                    Theme
                  </label>
                  <select
                    value={userPreferences.theme}
                    onChange={(e) => updateUserPreferences({ theme: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Language
                  </label>
                  <select
                    value={userPreferences.language}
                    onChange={(e) => updateUserPreferences({ language: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="english">English</option>
                    <option value="spanish">Spanish</option>
                    <option value="french">French</option>
                  </select>
                </div>

                {/* Auto-logout */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Auto-logout (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="480"
                    value={userPreferences.auto_logout}
                    onChange={(e) => updateUserPreferences({ auto_logout: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = No auto-logout</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}
    </div>
  );
};

export default SettingsManagement; 