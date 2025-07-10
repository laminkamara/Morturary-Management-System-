import { useEffect, useState } from 'react';
import { subscribeToTable, subscribeToUserNotifications } from '../services/database';
import { useAuth } from '../context/AuthContext';

export const useRealTimeData = <T>(
  tableName: string,
  initialData: T[],
  fetchData: () => Promise<T[]>
) => {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch initial data
    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await fetchData();
        setData(result);
      } catch (error) {
        console.error(`Error loading ${tableName}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time changes
    const subscription = subscribeToTable(tableName, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      setData(currentData => {
        switch (eventType) {
          case 'INSERT':
            return [newRecord, ...currentData];
          
          case 'UPDATE':
            return currentData.map(item => 
              (item as any).id === newRecord.id ? newRecord : item
            );
          
          case 'DELETE':
            return currentData.filter(item => 
              (item as any).id !== oldRecord.id
            );
          
          default:
            return currentData;
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [tableName]);

  return { data, setData, isLoading };
};

export const useRealTimeNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const subscription = subscribeToUserNotifications(user.id, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      setNotifications(currentNotifications => {
        switch (eventType) {
          case 'INSERT':
            setUnreadCount(prev => prev + 1);
            return [newRecord, ...currentNotifications];
          
          case 'UPDATE':
            if (newRecord.is_read && !oldRecord.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
            return currentNotifications.map(notification => 
              notification.id === newRecord.id ? newRecord : notification
            );
          
          case 'DELETE':
            if (!oldRecord.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
            return currentNotifications.filter(notification => 
              notification.id !== oldRecord.id
            );
          
          default:
            return currentNotifications;
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { notifications, unreadCount, setNotifications, setUnreadCount };
};