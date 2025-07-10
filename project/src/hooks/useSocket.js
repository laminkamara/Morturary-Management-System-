import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';

export const useSocket = () => {
  const { user } = useAuth();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (user && !isInitialized.current) {
      socketService.connect(user);
      isInitialized.current = true;
    }

    return () => {
      if (!user && isInitialized.current) {
        socketService.disconnect();
        isInitialized.current = false;
      }
    };
  }, [user]);

  return socketService;
};