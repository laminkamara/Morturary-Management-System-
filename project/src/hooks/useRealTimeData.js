import { useState, useEffect } from 'react';
import socketService from '../services/socket';

export const useRealTimeData = (initialData, dataType) => {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set up real-time listeners based on data type
    const handleCreate = (newItem) => {
      setData(prevData => {
        if (Array.isArray(prevData)) {
          return [newItem, ...prevData];
        }
        return newItem;
      });
    };

    const handleUpdate = (updatedItem) => {
      setData(prevData => {
        if (Array.isArray(prevData)) {
          return prevData.map(item => 
            item.id === updatedItem.id ? { ...item, ...updatedItem } : item
          );
        }
        return updatedItem;
      });
    };

    const handleDelete = (deletedItem) => {
      setData(prevData => {
        if (Array.isArray(prevData)) {
          return prevData.filter(item => item.id !== deletedItem.id);
        }
        return null;
      });
    };

    // Register listeners based on data type
    switch (dataType) {
      case 'bodies':
        socketService.on('bodyCreated', handleCreate);
        socketService.on('bodyUpdated', handleUpdate);
        socketService.on('bodyDeleted', handleDelete);
        break;
      case 'storage':
        socketService.on('storageUpdated', handleUpdate);
        break;
      case 'autopsies':
        socketService.on('autopsyCreated', handleCreate);
        socketService.on('autopsyUpdated', handleUpdate);
        socketService.on('autopsyDeleted', handleDelete);
        break;
      case 'tasks':
        socketService.on('taskCreated', handleCreate);
        socketService.on('taskUpdated', handleUpdate);
        socketService.on('taskDeleted', handleDelete);
        break;
      case 'releases':
        socketService.on('releaseCreated', handleCreate);
        socketService.on('releaseUpdated', handleUpdate);
        socketService.on('releaseDeleted', handleDelete);
        break;
      case 'users':
        socketService.on('userCreated', handleCreate);
        socketService.on('userUpdated', handleUpdate);
        socketService.on('userDeleted', handleDelete);
        break;
      case 'notifications':
        socketService.on('newNotification', handleCreate);
        socketService.on('notificationRead', handleUpdate);
        socketService.on('notificationDeleted', handleDelete);
        socketService.on('allNotificationsRead', () => {
          setData(prevData => {
            if (Array.isArray(prevData)) {
              return prevData.map(notification => ({ ...notification, is_read: true }));
            }
            return prevData;
          });
        });
        break;
    }

    // Cleanup listeners
    return () => {
      switch (dataType) {
        case 'bodies':
          socketService.off('bodyCreated', handleCreate);
          socketService.off('bodyUpdated', handleUpdate);
          socketService.off('bodyDeleted', handleDelete);
          break;
        case 'storage':
          socketService.off('storageUpdated', handleUpdate);
          break;
        case 'autopsies':
          socketService.off('autopsyCreated', handleCreate);
          socketService.off('autopsyUpdated', handleUpdate);
          socketService.off('autopsyDeleted', handleDelete);
          break;
        case 'tasks':
          socketService.off('taskCreated', handleCreate);
          socketService.off('taskUpdated', handleUpdate);
          socketService.off('taskDeleted', handleDelete);
          break;
        case 'releases':
          socketService.off('releaseCreated', handleCreate);
          socketService.off('releaseUpdated', handleUpdate);
          socketService.off('releaseDeleted', handleDelete);
          break;
        case 'users':
          socketService.off('userCreated', handleCreate);
          socketService.off('userUpdated', handleUpdate);
          socketService.off('userDeleted', handleDelete);
          break;
        case 'notifications':
          socketService.off('newNotification', handleCreate);
          socketService.off('notificationRead', handleUpdate);
          socketService.off('notificationDeleted', handleDelete);
          socketService.off('allNotificationsRead');
          break;
      }
    };
  }, [dataType]);

  const updateData = (newData) => {
    setData(newData);
  };

  const setLoadingState = (loading) => {
    setIsLoading(loading);
  };

  const setErrorState = (err) => {
    setError(err);
  };

  return {
    data,
    setData: updateData,
    isLoading,
    setIsLoading: setLoadingState,
    error,
    setError: setErrorState
  };
};