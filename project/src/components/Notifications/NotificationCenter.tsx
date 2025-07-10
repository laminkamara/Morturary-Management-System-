import React, { useState, useEffect } from 'react';
import { Bell, Check, X, AlertTriangle, Info, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { notificationsService } from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { useRealTimeData } from '../../hooks/useRealTime';

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let filters: any = { user_id: user.id };
      
      if (filter === 'read') {
        filters.read = true;
      } else if (filter === 'unread') {
        filters.read = false;
      }
      
      const data = await notificationsService.getAll(filters);
      setNotifications(data);
      
      // Fetch unread count separately
      const count = await notificationsService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user, filter]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const subscription = notificationsService.subscribeToUserNotifications(user.id, async (payload) => {
      if (payload.eventType === 'INSERT') {
        setNotifications(prev => [payload.new, ...prev]);
        // Update unread count
        const count = await notificationsService.getUnreadCount(user.id);
        setUnreadCount(count);
      } else if (payload.eventType === 'UPDATE') {
        setNotifications(prev => 
          prev.map(n => n.id === payload.new.id ? payload.new : n)
        );
        // Update unread count
        const count = await notificationsService.getUnreadCount(user.id);
        setUnreadCount(count);
      } else if (payload.eventType === 'DELETE') {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        // Update unread count
        const count = await notificationsService.getUnreadCount(user.id);
        setUnreadCount(count);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string, read: boolean) => {
    const opacity = read ? '50' : '100';
    switch (type) {
      case 'info':
        return `bg-blue-${opacity} border-blue-200`;
      case 'warning':
        return `bg-yellow-${opacity} border-yellow-200`;
      case 'error':
        return `bg-red-${opacity} border-red-200`;
      case 'success':
        return `bg-green-${opacity} border-green-200`;
      default:
        return `bg-gray-${opacity} border-gray-200`;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      
      // Update unread count
      const count = await notificationsService.getUnreadCount(user!.id);
      setUnreadCount(count);
      
      // If we're in unread filter, remove the notification from the list
      if (filter === 'unread') {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      // Update the notification to unread in the database
      await notificationsService.update(notificationId, { is_read: false });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: false } : n)
      );
      
      // Update unread count
      const count = await notificationsService.getUnreadCount(user!.id);
      setUnreadCount(count);
      
      // If we're in read filter, remove the notification from the list
      if (filter === 'read') {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationsService.delete(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      for (const notification of unreadNotifications) {
        await notificationsService.markAsRead(notification.id);
      }
      
      // Update the UI
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      // Update unread count
      setUnreadCount(0);
      
      // If we're in unread filter, clear the list
      if (filter === 'unread') {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const viewDetails = (notification: any) => {
    if (notification.action_url) {
      // In a real app, this would navigate to the URL
      alert(`This would navigate to: ${notification.action_url}\n\nNotification Details:\n${notification.title}\n${notification.message}`);
    } else {
      alert(`Notification Details:\n${notification.title}\n${notification.message}\nCreated: ${new Date(notification.created_at).toLocaleString()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bell className="w-8 h-8 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Stay updated with system alerts and messages</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={markAllAsRead}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
            </div>
            <Bell className="w-8 h-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">
                {notifications.filter(n => n.type === 'warning').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Info</p>
              <p className="text-2xl font-bold text-blue-600">
                {notifications.filter(n => n.type === 'info').length}
              </p>
            </div>
            <Info className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'unread' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'read' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Read
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications." 
                : "No notifications to display."}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white p-6 rounded-lg shadow-sm border-l-4 border transition-all hover:shadow-md ${
                notification.is_read ? 'opacity-75' : ''
              } ${getNotificationBgColor(notification.type, notification.is_read)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`text-lg font-semibold ${
                        notification.is_read ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className={`text-sm mb-3 ${
                      notification.is_read ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                      {notification.action_url && (
                        <button
                          onClick={() => viewDetails(notification)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {notification.is_read ? (
                    <button
                      onClick={() => markAsUnread(notification.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Mark as unread"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notification Settings */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Task Reminders</h3>
              <p className="text-sm text-gray-500">Get notified about upcoming task deadlines</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Storage Alerts</h3>
              <p className="text-sm text-gray-500">Receive alerts when storage capacity is high</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">System Updates</h3>
              <p className="text-sm text-gray-500">Get notified about system maintenance and updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;